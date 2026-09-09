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
  runsAroundRect,
  sidesForLayout,
  sidesForSet,
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
import { pasteElements } from "@shared/studio/design";
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

/* ------------------------------------------------------------------ *
 * Tier 2 assemblies
 * ------------------------------------------------------------------ */

describe("runs around a rectangle", () => {
  it("gives the sides of the named set", () => {
    expect(sidesForSet("perimeter")).toHaveLength(4);
    expect(sidesForSet("three")).toHaveLength(3);
    expect(sidesForSet("one")).toEqual(["north"]);
    // An unknown set must not silently produce nothing at all.
    expect(sidesForSet("nonsense")).toHaveLength(4);
  });

  it("shortens the side runs so corners meet rather than overlap", () => {
    const runs = runsAroundRect(sidesForSet("perimeter"), 4000, 3000, 500);
    const north = runs.find((run) => run.side === "north");
    const east = runs.find((run) => run.side === "east");

    expect(north?.lengthMm).toBe(4000);
    expect(east?.lengthMm).toBe(3000 - 500 * 2);
    expect(east?.rotationDeg).toBe(90);
    expect(north?.z).toBe(-3000 / 2 + 500 / 2);
  });

  it("never produces a zero-length run, however thin the rectangle", () => {
    for (const run of runsAroundRect(sidesForSet("perimeter"), 1000, 1000, 800)) {
      expect(run.lengthMm).toBeGreaterThan(0);
    }
  });

  it("is the one implementation — seating, planting and screening agree", () => {
    const design = createEmptyDesign();
    const seating = place(design, "ASM-SEATING");
    const planting = place(design, "ASM-PLANTING", 6000, 0);

    // Both at a 3000 span with their own run depth: the north run spans the
    // full width in each, because they share the same geometry.
    const bench = deriveParts(seating).find((entry) => entry.id.endsWith("north"));
    const bed = deriveParts(planting).find((entry) => entry.id.endsWith("bed-north"));
    expect(bench?.widthMm).toBe(3000);
    expect(bed?.widthMm).toBe(3000);
  });
});

describe("planting border", () => {
  it("derives a bed per side and planting inside each", () => {
    const design = createEmptyDesign();
    const planting = place(design, "ASM-PLANTING");
    const parts = deriveParts(planting);

    expect(parts.filter((e) => e.typeId === "EL-PLANTER")).toHaveLength(4);
    expect(parts.filter((e) => e.typeId === "EL-PLANT").length).toBeGreaterThan(0);
  });

  it("sits the planting on the soil, not on the floor", () => {
    const design = createEmptyDesign();
    let planting = place(design, "ASM-PLANTING");
    planting = patch(design, planting, { bedHeight: 600 });

    const plants = deriveParts(planting).filter((e) => e.typeId === "EL-PLANT");
    expect(plants.length).toBeGreaterThan(0);
    expect(plants.every((plant) => plant.elevationMm === 600)).toBe(true);
  });

  it("keeps the planting inside the bed it grows in", () => {
    const design = createEmptyDesign();
    let planting = place(design, "ASM-PLANTING");
    planting = patch(design, planting, { bedDepth: 300 });

    const plants = deriveParts(planting).filter((e) => e.typeId === "EL-PLANT");
    for (const plant of plants) expect(plant.widthMm).toBeLessThanOrEqual(300);
  });

  it("thins out on sparse and empties completely on none", () => {
    const design = createEmptyDesign();
    let planting = place(design, "ASM-PLANTING");
    const full = deriveParts(planting).filter((e) => e.typeId === "EL-PLANT").length;

    planting = patch(design, planting, { planting: "low" });
    const low = deriveParts(planting).filter((e) => e.typeId === "EL-PLANT").length;

    planting = patch(design, planting, { planting: "none" });
    const none = deriveParts(planting);

    expect(low).toBeLessThan(full);
    expect(low).toBeGreaterThan(0);
    expect(none.filter((e) => e.typeId === "EL-PLANT")).toHaveLength(0);
    // The beds themselves stay.
    expect(none.filter((e) => e.typeId === "EL-PLANTER")).toHaveLength(4);
  });

  it("does not report its own beds as colliding", () => {
    const design = createEmptyDesign();
    place(design, "ASM-PLANTING");
    expect(findCollisions(design)).toHaveLength(0);
  });

  it("drops the planting height from its footprint when there is no planting", () => {
    const design = createEmptyDesign();
    let planting = place(design, "ASM-PLANTING");
    const planted = planting.heightMm;
    planting = patch(design, planting, { planting: "none" });

    expect(planting.heightMm).toBeLessThan(planted);
    expect(planting.heightMm).toBe(450);
  });
});

describe("lighting run", () => {
  it("lays a row of the requested count", () => {
    const design = createEmptyDesign();
    let lighting = place(design, "ASM-LIGHTING");
    lighting = patch(design, lighting, { countW: 5 });

    const parts = deriveParts(lighting);
    expect(parts).toHaveLength(5);
    expect(parts.every((entry) => entry.typeId === "EL-PENDANT")).toBe(true);
    expect(parts.every((entry) => entry.z === lighting.z)).toBe(true);
  });

  it("multiplies out into a grid", () => {
    const design = createEmptyDesign();
    let lighting = place(design, "ASM-LIGHTING");
    lighting = patch(design, lighting, { pattern: "grid", countW: 3, countD: 4 });
    expect(deriveParts(lighting)).toHaveLength(12);
  });

  it("puts one fixture at each perimeter corner, not two", () => {
    const design = createEmptyDesign();
    let lighting = place(design, "ASM-LIGHTING");
    lighting = patch(design, lighting, { pattern: "perimeter", countW: 3 });

    const parts = deriveParts(lighting);
    const places = parts.map((entry) => `${entry.x},${entry.z}`);
    // A duplicate at a corner would look like one light and price as two.
    expect(new Set(places).size).toBe(places.length);
  });

  it("hangs pendants and stands lanterns on the floor", () => {
    const design = createEmptyDesign();
    let lighting = place(design, "ASM-LIGHTING");
    lighting = patch(design, lighting, { mountHeight: 2400 });
    expect(deriveParts(lighting).every((e) => e.elevationMm === 2400)).toBe(true);

    lighting = patch(design, lighting, { fixture: "lantern", lanternHeight: 1200 });
    const lanterns = deriveParts(lighting);
    expect(lanterns.every((e) => e.typeId === "EL-FLOOR-LAMP")).toBe(true);
    expect(lanterns.every((e) => e.elevationMm === 0)).toBe(true);
    expect(lanterns.every((e) => e.heightMm === 1200)).toBe(true);
  });

  it("declares the controls that would do nothing as conditional", () => {
    const spec = getElementType("ASM-LIGHTING")?.assembly?.params ?? [];
    const mount = spec.find((entry) => entry.key === "mountHeight");
    const lantern = spec.find((entry) => entry.key === "lanternHeight");

    expect(mount?.showWhen).toEqual({ key: "fixture", equals: "pendant" });
    expect(lantern?.showWhen).toEqual({ key: "fixture", equals: "lantern" });
  });

  it("carries the electrical review finding through to the design", () => {
    const design = createEmptyDesign();
    place(design, "ASM-LIGHTING");
    const codes = evaluateStudioDesign(design).messages.map((m) => m.code);
    expect(codes).toContain("STUDIO_POWER_SUPPLY");
  });
});

describe("screen wall", () => {
  it("builds a panel per chosen side", () => {
    const design = createEmptyDesign();
    let screen = place(design, "ASM-SCREEN");
    expect(deriveParts(screen)).toHaveLength(2);

    screen = patch(design, screen, { sides: "perimeter" });
    expect(deriveParts(screen)).toHaveLength(4);
  });

  it("swaps the part for the chosen style", () => {
    const design = createEmptyDesign();
    let screen = place(design, "ASM-SCREEN");
    expect(deriveParts(screen).every((e) => e.typeId === "EL-SCREEN")).toBe(true);

    screen = patch(design, screen, { style: "trellis" });
    expect(deriveParts(screen).every((e) => e.typeId === "EL-TRELLIS")).toBe(true);

    screen = patch(design, screen, { style: "balustrade" });
    expect(deriveParts(screen).every((e) => e.typeId === "EL-BALUSTRADE")).toBe(true);
  });

  it("never builds a panel taller than the palette would allow for that style", () => {
    const design = createEmptyDesign();
    let screen = place(design, "ASM-SCREEN");
    screen = patch(design, screen, { style: "balustrade", height: 3000 });

    const max = getElementType("EL-BALUSTRADE")?.resize.height?.maxMm ?? 0;
    expect(max).toBeLessThan(3000);
    for (const panel of deriveParts(screen)) {
      expect(panel.heightMm).toBeLessThanOrEqual(max);
    }
    // And the footprint agrees with what was actually built.
    expect(screen.heightMm).toBe(max);
    // As does the stored parameter, so the slider cannot sit at 3000 while the
    // wall it describes is 1300.
    expect(screen.params?.height).toBe(max);
  });

  it("keeps the height honest across a style change", () => {
    const design = createEmptyDesign();
    let screen = place(design, "ASM-SCREEN");
    screen = patch(design, screen, { style: "screen", height: 2800 });
    expect(screen.params?.height).toBe(2800);

    // Switching to a style that cannot be that tall must bring the stored
    // value down with it, not leave the control describing something else.
    screen = patch(design, screen, { style: "balustrade" });
    const max = getElementType("EL-BALUSTRADE")?.resize.height?.maxMm ?? 0;
    expect(screen.params?.height).toBe(max);
    expect(screen.heightMm).toBe(max);
  });

  it("raises the wind-load review the loose screen raises", () => {
    const design = createEmptyDesign();
    place(design, "ASM-SCREEN");
    const codes = evaluateStudioDesign(design).messages.map((m) => m.code);
    expect(codes).toContain("STUDIO_WIND_LOAD");
  });
});

describe("findings address something selectable", () => {
  it("reports a pavilion, not one of its derived posts", () => {
    const design = createEmptyDesign();
    const pavilion = place(design, "ASM-PAVILION");
    const corner = deriveParts(pavilion).find((entry) => entry.typeId === "EL-POST");
    if (!corner) throw new Error("no post derived");
    const loose = place(design, "EL-POST", corner.x, corner.z);

    const overlap = evaluateStudioDesign(design).messages.find(
      (entry) => entry.code === "STUDIO_OVERLAP",
    );
    expect(overlap).toBeDefined();
    expect(overlap?.affectedIds).toContain(pavilion.id);
    expect(overlap?.affectedIds).toContain(loose.id);
    // A synthetic part id would select nothing when the finding is clicked.
    const ids = design.elements.map((entry) => entry.id);
    for (const id of overlap?.affectedIds ?? []) expect(ids).toContain(id);
  });
});

describe("copying elements", () => {
  it("gives fresh ids and offsets the copy off the original", () => {
    const design = createEmptyDesign();
    const chair = place(design, "EL-CHAIR");
    const [copy] = pasteElements([chair], design);

    expect(copy.id).not.toBe(chair.id);
    expect(copy.typeId).toBe(chair.typeId);
    expect(copy.x === chair.x && copy.z === chair.z).toBe(false);
  });

  it("preserves the arrangement of a set", () => {
    const design = createEmptyDesign();
    const a = place(design, "EL-CHAIR", -1000, 0);
    const b = place(design, "EL-CHAIR", 1000, 0);
    const [copyA, copyB] = pasteElements([a, b], design);

    // One offset for the whole set: a copied pair must still be a pair.
    expect(copyB.x - copyA.x).toBe(b.x - a.x);
    expect(copyB.z - copyA.z).toBe(b.z - a.z);
  });

  it("copies an assembly as an assembly, parameters and all", () => {
    const design = createEmptyDesign();
    let pavilion = place(design, "ASM-PAVILION");
    pavilion = patch(design, pavilion, { spanW: 5000, roofStyle: "gable" });

    const [copy] = pasteElements([pavilion], design);
    expect(copy.params?.spanW).toBe(5000);
    expect(copy.params?.roofStyle).toBe("gable");
    expect(deriveParts(copy).some((e) => e.typeId === "EL-ROOF-GABLE")).toBe(true);
  });

  it("drops elements whose type is no longer in the catalog", () => {
    const design = createEmptyDesign();
    const chair = place(design, "EL-CHAIR");
    const stale = { ...chair, id: "stale", typeId: "EL-GONE" };
    expect(pasteElements([chair, stale], design)).toHaveLength(1);
  });

  it("never pastes a derived part still claiming a parent", () => {
    const design = createEmptyDesign();
    const pavilion = place(design, "ASM-PAVILION");
    const part = deriveParts(pavilion)[0];

    const [pasted] = pasteElements([part], design);
    expect(parentOf(pasted)).toBeUndefined();
  });
});
