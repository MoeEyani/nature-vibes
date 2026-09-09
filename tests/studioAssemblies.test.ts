import { describe, expect, it } from "vitest";
import {
  assemblySize,
  clampParams,
  defaultParts,
  deriveParts,
  expandDesign,
  isAssembly,
  parentOf,
  resolveParams,
  sidesForLayout,
} from "@shared/studio/assemblies";
import {
  STUDIO_ELEMENT_TYPES,
  getElementType,
  isAssemblyType,
  typesByGroup,
} from "@shared/studio/catalog";
import {
  applyPatch,
  createElement,
  createEmptyDesign,
  explodeAssembly,
} from "@shared/studio/design";
import { findCollisions } from "@shared/studio/geometry";
import {
  assemblyStartingPrice,
  calculateStudioPrice,
  priceElementLines,
} from "@shared/studio/pricing";
import { evaluateStudioDesign } from "@shared/studio/rules";
import { studioDesignSchema } from "@shared/studio/schema";
import type { StudioDesign, StudioElement } from "@shared/studio/schema";

/**
 * Assemblies — the parametric "dynamic group".
 *
 * The property that matters is that nothing is stored twice: an assembly holds
 * parameters and derives its parts, so there is no second copy to fall out of
 * step. These tests pin that down from both ends — the derivation itself, and
 * the fact that every consumer sees the parts rather than the container.
 */

function place(design: StudioDesign, typeId: string, x = 0, z = 0): StudioElement {
  const element = createElement(typeId, { x, z }, design);
  if (!element) throw new Error(`unknown type ${typeId}`);
  design.elements.push(element);
  return element;
}

function patch(
  design: StudioDesign,
  element: StudioElement,
  params: Record<string, number | string>,
): StudioElement {
  const next = applyPatch(element, { params }, design);
  design.elements = design.elements.map((entry) =>
    entry.id === element.id ? next : entry,
  );
  return next;
}

describe("assembly catalog", () => {
  it("keeps derived-only types out of the palette", () => {
    const hidden = STUDIO_ELEMENT_TYPES.filter((type) => type.hidden);
    expect(hidden.length).toBeGreaterThan(0);

    const offered = typesByGroup("Structure").map((type) => type.id);
    for (const type of hidden) {
      expect(offered).not.toContain(type.id);
    }
  });

  it("declares defaults for every parameter it specifies", () => {
    for (const type of STUDIO_ELEMENT_TYPES) {
      if (!type.assembly) continue;
      for (const spec of type.assembly.params) {
        expect(type.assembly.defaults[spec.key]).toBeDefined();
      }
    }
  });

  it("gives every roof style named by the pavilion a catalog record", () => {
    const spec = getElementType("ASM-PAVILION")?.assembly?.params.find(
      (entry) => entry.key === "roofStyle",
    );
    expect(spec?.kind).toBe("choice");
    if (spec?.kind !== "choice") return;

    for (const option of spec.options) {
      expect(getElementType(`EL-ROOF-${option.value.toUpperCase()}`)).toBeDefined();
    }
  });

  it("keeps the palette's advertised size equal to what the defaults derive", () => {
    for (const type of STUDIO_ELEMENT_TYPES) {
      if (!type.assembly) continue;
      expect(assemblySize(type.id, type.assembly.defaults)).toEqual(type.defaultSize);
    }
  });

  it("quotes an assembly by its parts, never as free", () => {
    for (const type of STUDIO_ELEMENT_TYPES) {
      if (!type.assembly) continue;
      expect(defaultParts(type.id).length).toBeGreaterThan(0);
      expect(assemblyStartingPrice(type.id)).toBeGreaterThan(0);
    }
    expect(assemblyStartingPrice("EL-CHAIR")).toBe(0);
  });

  it("prices assemblies at zero of their own, so parts carry the cost", () => {
    for (const type of STUDIO_ELEMENT_TYPES) {
      if (!type.assembly) continue;
      expect(type.price.amount).toBe(0);
      // Collision is checked on the derived parts; a solid container would
      // report a clash for anything placed inside the pavilion.
      expect(type.solid).toBe(false);
    }
  });
});

describe("pavilion derivation", () => {
  it("derives four posts, four beams and a roof for a single bay", () => {
    const design = createEmptyDesign();
    const pavilion = place(design, "ASM-PAVILION");
    const parts = deriveParts(pavilion);

    const count = (typeId: string) =>
      parts.filter((entry) => entry.typeId === typeId).length;

    expect(count("EL-POST")).toBe(4);
    expect(count("EL-BEAM")).toBe(4);
    expect(count("EL-ROOF-PYRAMID")).toBe(1);
  });

  it("adds perimeter posts with more bays but never an interior one", () => {
    const design = createEmptyDesign();
    let pavilion = place(design, "ASM-PAVILION");
    pavilion = patch(design, pavilion, { spanW: 6000, spanD: 6000, baysW: 2, baysD: 2 });

    const posts = deriveParts(pavilion).filter((entry) => entry.typeId === "EL-POST");
    // A 2×2 bay grid has 9 nodes; the centre one would stand in the middle of
    // the space, which is not what a pavilion is.
    expect(posts).toHaveLength(8);
    expect(posts.some((post) => post.x === 0 && post.z === 0)).toBe(false);
  });

  it("moves the posts with the span, with nothing to keep in sync", () => {
    const design = createEmptyDesign();
    let pavilion = place(design, "ASM-PAVILION");
    const before = deriveParts(pavilion)
      .filter((entry) => entry.typeId === "EL-POST")
      .map((entry) => entry.x)
      .sort((a, b) => a - b);

    pavilion = patch(design, pavilion, { spanW: 5000 });
    const after = deriveParts(pavilion)
      .filter((entry) => entry.typeId === "EL-POST")
      .map((entry) => entry.x)
      .sort((a, b) => a - b);

    expect(before[0]).toBe(-1500);
    expect(after[0]).toBe(-2500);
    expect(after.at(-1)).toBe(2500);
  });

  it("lands the roof on the eave and overhangs the span on both sides", () => {
    const design = createEmptyDesign();
    let pavilion = place(design, "ASM-PAVILION");
    pavilion = patch(design, pavilion, {
      spanW: 4000,
      spanD: 3000,
      eaveHeight: 2800,
      overhang: 400,
    });

    const roof = deriveParts(pavilion).find((entry) =>
      entry.typeId.startsWith("EL-ROOF-"),
    );
    expect(roof).toBeDefined();
    expect(roof?.widthMm).toBe(4800);
    expect(roof?.depthMm).toBe(3800);
    expect(roof?.elevationMm).toBe(2800);

    const posts = deriveParts(pavilion).filter((entry) => entry.typeId === "EL-POST");
    expect(posts.every((post) => post.heightMm === 2800)).toBe(true);
  });

  it("swaps only the roof when the style changes", () => {
    const design = createEmptyDesign();
    let pavilion = place(design, "ASM-PAVILION");
    const postsBefore = deriveParts(pavilion).filter(
      (entry) => entry.typeId === "EL-POST",
    );

    pavilion = patch(design, pavilion, { roofStyle: "louvered" });
    const parts = deriveParts(pavilion);

    expect(parts.some((entry) => entry.typeId === "EL-ROOF-LOUVERED")).toBe(true);
    expect(parts.some((entry) => entry.typeId === "EL-ROOF-PYRAMID")).toBe(false);
    expect(parts.filter((entry) => entry.typeId === "EL-POST")).toHaveLength(
      postsBefore.length,
    );
  });

  it("carries the assembly's own rotation into every part", () => {
    const design = createEmptyDesign();
    const pavilion = place(design, "ASM-PAVILION", 0, 0);
    const rotated = applyPatch(pavilion, { rotationDeg: 90 }, design);

    const upright = deriveParts(pavilion).filter((e) => e.typeId === "EL-POST");
    const turned = deriveParts(rotated).filter((e) => e.typeId === "EL-POST");

    // A 90° turn maps (x, z) to (-z, x): the same four corners, relabelled.
    const key = (list: typeof upright) =>
      list.map((entry) => `${entry.x},${entry.z}`).sort();
    expect(key(turned)).toEqual(key(upright));
    expect(turned.every((entry) => entry.rotationDeg === 90)).toBe(true);
  });
});

describe("seating derivation", () => {
  it("reads its sides from the wizard's own seating catalog", () => {
    expect(sidesForLayout("SEAT-PERIMETER")).toHaveLength(4);
    expect(sidesForLayout("SEAT-ONE-SIDE")).toHaveLength(1);
    expect(sidesForLayout("SEAT-U")).toHaveLength(3);
    expect(sidesForLayout("NOT-A-LAYOUT")).toEqual([]);
  });

  it("builds one run per side of the chosen layout", () => {
    const design = createEmptyDesign();
    let seating = place(design, "ASM-SEATING");
    expect(deriveParts(seating)).toHaveLength(4);

    seating = patch(design, seating, { layoutId: "SEAT-L" });
    expect(deriveParts(seating)).toHaveLength(sidesForLayout("SEAT-L").length);
  });

  it("insets the side runs so the corners meet instead of overlapping", () => {
    const design = createEmptyDesign();
    const seating = place(design, "ASM-SEATING");
    const parts = deriveParts(seating);

    const north = parts.find((entry) => entry.id.endsWith("north"));
    const east = parts.find((entry) => entry.id.endsWith("east"));
    expect(north?.widthMm).toBe(3000);
    // 3000 deep less a 550 seat at each end.
    expect(east?.widthMm).toBe(1900);

    // And the runs of one layout must not be reported as clashing with each other.
    expect(findCollisions(design)).toHaveLength(0);
  });

  it("works back from the seat height for a lounge, whose seat is not its top", () => {
    const design = createEmptyDesign();
    let seating = place(design, "ASM-SEATING");
    seating = patch(design, seating, { style: "lounge", seatHeight: 440 });

    const parts = deriveParts(seating);
    expect(parts.every((entry) => entry.typeId === "EL-LOUNGE")).toBe(true);
    // The lounge geometry puts its seat at 55% of overall height.
    expect(parts[0].heightMm).toBe(Math.round(440 / 0.55));
  });
});

describe("parameters are the only way in", () => {
  it("clamps a parameter to its declared range and step", () => {
    const params = clampParams("ASM-PAVILION", {
      spanW: 99999,
      spanD: 10,
      eaveHeight: 2617,
      roofStyle: "not-a-style",
    });

    expect(params.spanW).toBe(8000);
    expect(params.spanD).toBe(1800);
    expect(params.eaveHeight).toBe(2600);
    expect(params.roofStyle).toBe("pyramid");
  });

  it("drops parameters the type does not declare", () => {
    const params = clampParams("ASM-PAVILION", { spanW: 3000, nonsense: 42 });
    expect(params.nonsense).toBeUndefined();
  });

  it("ignores a direct size patch — the footprint is a result, not an input", () => {
    const design = createEmptyDesign();
    const pavilion = place(design, "ASM-PAVILION");
    const before = pavilion.widthMm;

    const patched = applyPatch(pavilion, { widthMm: 7000 }, design);
    expect(patched.widthMm).toBe(before);

    // Changing the span, which is a parameter, does resize it.
    const resized = applyPatch(patched, { params: { spanW: 5000 } }, design);
    expect(resized.widthMm).toBe(5000 + 300 * 2);
  });

  it("keeps the stored footprint equal to what the parameters imply", () => {
    const design = createEmptyDesign();
    let pavilion = place(design, "ASM-PAVILION");
    pavilion = patch(design, pavilion, { spanW: 4200, spanD: 2500, overhang: 150 });

    const implied = assemblySize("ASM-PAVILION", resolveParams(pavilion));
    expect(implied).toEqual({
      widthMm: pavilion.widthMm,
      depthMm: pavilion.depthMm,
      heightMm: pavilion.heightMm,
    });
  });

  it("survives a round trip through the persisted schema", () => {
    const design = createEmptyDesign();
    place(design, "ASM-PAVILION");
    const parsed = studioDesignSchema.parse(JSON.parse(JSON.stringify(design)));
    expect(parsed.elements[0].params?.roofStyle).toBe("pyramid");
  });
});

describe("everything downstream sees the parts", () => {
  it("expands an assembly and leaves plain elements alone", () => {
    const design = createEmptyDesign();
    const pavilion = place(design, "ASM-PAVILION");
    const chair = place(design, "EL-CHAIR", 4000, 0);

    const expanded = expandDesign(design);
    expect(expanded).toHaveLength(deriveParts(pavilion).length + 1);
    expect(expanded.filter((entry) => entry.id === pavilion.id)).toHaveLength(0);
    expect(expanded.filter((entry) => entry.id === chair.id)).toHaveLength(1);
    expect(expanded.filter((entry) => parentOf(entry) === pavilion.id).length).toBe(
      deriveParts(pavilion).length,
    );
  });

  it("prices a pavilion as the sum of its parts, not as a lump sum", () => {
    const design = createEmptyDesign();
    const pavilion = place(design, "ASM-PAVILION");

    const lines = priceElementLines(pavilion);
    const total = lines.reduce((sum, line) => sum + line.subtotal, 0);

    expect(getElementType("ASM-PAVILION")?.price.amount).toBe(0);
    expect(total).toBeGreaterThan(0);
    expect(calculateStudioPrice(design).total).toBe(total);
    // Every line traces back to a real catalogued part.
    expect(lines.every((line) => Boolean(line.sku))).toBe(true);
  });

  it("re-prices when a parameter changes", () => {
    const design = createEmptyDesign();
    const before = calculateStudioPrice(design).total;
    let pavilion = place(design, "ASM-PAVILION");
    const single = calculateStudioPrice(design).total;

    pavilion = patch(design, pavilion, { spanW: 8000, spanD: 8000, baysW: 3, baysD: 3 });
    const bigger = calculateStudioPrice(design).total;

    expect(before).toBe(0);
    expect(bigger).toBeGreaterThan(single);
  });

  it("does not report a pavilion's own posts as colliding with each other", () => {
    const design = createEmptyDesign();
    place(design, "ASM-PAVILION");
    expect(findCollisions(design)).toHaveLength(0);
    expect(
      evaluateStudioDesign(design).messages.some((m) => m.code === "STUDIO_OVERLAP"),
    ).toBe(false);
  });

  it("still reports a real clash between a pavilion post and a loose post", () => {
    const design = createEmptyDesign();
    const pavilion = place(design, "ASM-PAVILION");
    const corner = deriveParts(pavilion).find((entry) => entry.typeId === "EL-POST");
    if (!corner) throw new Error("no post derived");

    place(design, "EL-POST", corner.x, corner.z);
    expect(findCollisions(design).length).toBeGreaterThan(0);
  });

  it("lets a bench sit inside a pavilion without being called a clash", () => {
    const design = createEmptyDesign();
    place(design, "ASM-PAVILION");
    place(design, "EL-CHAIR", 0, 0);
    expect(findCollisions(design)).toHaveLength(0);
  });
});

describe("ungrouping", () => {
  it("replaces the assembly with loose, independently editable elements", () => {
    const design = createEmptyDesign();
    const pavilion = place(design, "ASM-PAVILION");
    const parts = explodeAssembly(pavilion, design);

    expect(parts).toHaveLength(deriveParts(pavilion).length);
    expect(parts.every((entry) => !isAssembly(entry))).toBe(true);
    // Fresh ids, and no lingering link to a parent that no longer exists.
    expect(new Set(parts.map((entry) => entry.id)).size).toBe(parts.length);
    expect(parts.every((entry) => parentOf(entry) === undefined)).toBe(true);
    expect(parts.every((entry) => entry.id.includes(":"))).toBe(false);
  });

  it("keeps the parts where they were, so ungrouping changes nothing visible", () => {
    const design = createEmptyDesign();
    const pavilion = place(design, "ASM-PAVILION", 1000, -500);

    const derived = deriveParts(pavilion);
    const exploded = explodeAssembly(pavilion, design);

    const key = (list: StudioElement[]) =>
      list
        .map((e) => `${e.typeId}@${e.x},${e.z},${e.elevationMm},${e.rotationDeg}`)
        .sort();
    expect(key(exploded)).toEqual(key(derived));
  });

  it("prices the same before and after", () => {
    const design = createEmptyDesign();
    const pavilion = place(design, "ASM-PAVILION");
    const grouped = calculateStudioPrice(design).total;

    design.elements = explodeAssembly(pavilion, design);
    expect(calculateStudioPrice(design).total).toBe(grouped);
  });

  it("returns a plain element untouched", () => {
    const design = createEmptyDesign();
    const chair = place(design, "EL-CHAIR");
    expect(isAssemblyType(chair.typeId)).toBe(false);
    expect(explodeAssembly(chair, design)).toEqual([chair]);
  });
});
