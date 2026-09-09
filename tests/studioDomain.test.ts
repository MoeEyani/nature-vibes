import { describe, expect, it } from "vitest";
import {
  applyPatch,
  createElement,
  createEmptyDesign,
  duplicateElement,
  normalizeDesign,
} from "@shared/studio/design";
import {
  STUDIO_ELEMENT_TYPES,
  STUDIO_COLOR_INDEX,
  getElementType,
} from "@shared/studio/catalog";
import {
  calculateStudioPrice,
  estimateSeats,
  groupStudioLines,
  quantityFor,
} from "@shared/studio/pricing";
import { evaluateStudioDesign, MIN_CIRCULATION_MM } from "@shared/studio/rules";
import type { StudioDesign, StudioElement } from "@shared/studio/schema";

function place(
  design: StudioDesign,
  typeId: string,
  x = 0,
  z = 0,
  patch: Partial<StudioElement> = {},
): StudioElement {
  const element = createElement(typeId, { x, z }, design);
  if (!element) throw new Error(`unknown type ${typeId}`);
  const placed = { ...element, ...patch };
  design.elements.push(placed);
  return placed;
}

describe("element palette", () => {
  it("has no duplicate ids", () => {
    const ids = STUDIO_ELEMENT_TYPES.map((type) => type.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("marks every price as a placeholder", () => {
    const confirmed = STUDIO_ELEMENT_TYPES.filter(
      (type) => type.price.status !== "placeholder",
    );
    expect(confirmed).toEqual([]);
  });

  it("offers only colours that exist", () => {
    const dangling = STUDIO_ELEMENT_TYPES.flatMap((type) =>
      type.colorIds.filter((id) => !STUDIO_COLOR_INDEX[id]).map((id) => `${type.id} -> ${id}`),
    );
    expect(dangling).toEqual([]);
  });

  it("gives every default size a value inside its own resize range", () => {
    const bad: string[] = [];
    for (const type of STUDIO_ELEMENT_TYPES) {
      const checks: [number, { minMm: number; maxMm: number } | undefined, string][] = [
        [type.defaultSize.widthMm, type.resize.width, "width"],
        [type.defaultSize.depthMm, type.resize.depth, "depth"],
        [type.defaultSize.heightMm, type.resize.height, "height"],
      ];
      for (const [value, range, axis] of checks) {
        if (range && (value < range.minMm || value > range.maxMm)) {
          bad.push(`${type.id} ${axis}=${value} outside ${range.minMm}..${range.maxMm}`);
        }
      }
      if (
        type.elevation &&
        (type.defaultElevationMm < type.elevation.minMm ||
          type.defaultElevationMm > type.elevation.maxMm)
      ) {
        bad.push(`${type.id} elevation outside its range`);
      }
    }
    expect(bad).toEqual([]);
  });
});

describe("placing and editing", () => {
  it("places an element with its type's defaults", () => {
    const design = createEmptyDesign();
    const bench = place(design, "EL-BENCH", 0, 0);
    const type = getElementType("EL-BENCH")!;

    expect(bench.widthMm).toBe(type.defaultSize.widthMm);
    expect(bench.colorId).toBe(type.colorIds[0]);
    expect(bench.rotationDeg).toBe(0);
  });

  it("snaps a placement to the grid", () => {
    const design = createEmptyDesign();
    const element = place(design, "EL-POST", 1234, -1266);
    expect(element.x).toBe(1200);
    expect(element.z).toBe(-1300);
  });

  it("returns null for an unknown type instead of inventing one", () => {
    const design = createEmptyDesign();
    expect(createElement("EL-NOT-REAL", { x: 0, z: 0 }, design)).toBeNull();
  });

  it("holds a hand-typed size inside the buildable range", () => {
    const design = createEmptyDesign();
    const post = place(design, "EL-POST");
    const type = getElementType("EL-POST")!;

    const tooTall = applyPatch(post, { heightMm: 99_000 }, design);
    expect(tooTall.heightMm).toBe(type.resize.height!.maxMm);

    const tooShort = applyPatch(post, { heightMm: 1 }, design);
    expect(tooShort.heightMm).toBe(type.resize.height!.minMm);
  });

  it("leaves a dimension the type does not offer for resizing", () => {
    const design = createEmptyDesign();
    // A pendant's depth is not resizable, so it must not drift.
    const pendant = place(design, "EL-PENDANT");
    const patched = applyPatch(pendant, { depthMm: 5000 }, design);
    expect(patched.depthMm).toBe(pendant.depthMm);
  });

  it("normalises rotation into 0..359", () => {
    const design = createEmptyDesign();
    const chair = place(design, "EL-CHAIR");
    expect(applyPatch(chair, { rotationDeg: 450 }, design).rotationDeg).toBe(90);
    expect(applyPatch(chair, { rotationDeg: -90 }, design).rotationDeg).toBe(270);
  });

  it("refuses a colour the type does not offer", () => {
    const design = createEmptyDesign();
    const bench = place(design, "EL-BENCH");
    const patched = applyPatch(bench, { colorId: "COL-MOSS" }, design);
    expect(patched.colorId).toBe(bench.colorId);
  });

  it("keeps an edited element inside the site", () => {
    const design = createEmptyDesign();
    const deck = place(design, "EL-DECK");
    const patched = applyPatch(deck, { x: 999_000 }, design);
    expect(patched.x).toBeLessThan(design.site.widthMm);
  });

  it("offsets a duplicate so it is visibly separate", () => {
    const design = createEmptyDesign();
    const chair = place(design, "EL-CHAIR", 0, 0);
    const copy = duplicateElement(chair, design);

    expect(copy.id).not.toBe(chair.id);
    expect(copy.x === chair.x && copy.z === chair.z).toBe(false);
  });

  it("drops unknown element types when loading a stored design", () => {
    const design = createEmptyDesign();
    place(design, "EL-CHAIR");
    design.elements.push({ ...design.elements[0], id: "ghost", typeId: "EL-GONE" });

    const normalised = normalizeDesign(design);
    expect(normalised.elements).toHaveLength(1);
    expect(normalised.elements[0].typeId).toBe("EL-CHAIR");
  });
});

describe("pricing", () => {
  it("is zero for an empty design", () => {
    expect(calculateStudioPrice(createEmptyDesign()).total).toBe(0);
  });

  it("prices per unit, per metre and per square metre from the type", () => {
    const design = createEmptyDesign();
    const chair = place(design, "EL-CHAIR");
    const bench = place(design, "EL-BENCH", 3000);
    const deck = place(design, "EL-DECK", -3000);

    expect(quantityFor(chair)).toEqual({ quantity: 1, unit: "unit" });
    expect(quantityFor(bench)).toEqual({ quantity: 1.8, unit: "m" });
    expect(quantityFor(deck)).toEqual({ quantity: 9, unit: "m²" });
  });

  it("grows the total when an element is lengthened", () => {
    const design = createEmptyDesign();
    const bench = place(design, "EL-BENCH");
    const before = calculateStudioPrice(design).total;

    design.elements = [applyPatch(bench, { widthMm: 3600 }, design)];
    expect(calculateStudioPrice(design).total).toBeGreaterThan(before);
  });

  it("labels the total as an estimate", () => {
    const design = createEmptyDesign();
    place(design, "EL-CHAIR");
    expect(calculateStudioPrice(design).isEstimate).toBe(true);
  });

  it("groups identical types with a count", () => {
    const design = createEmptyDesign();
    place(design, "EL-POST", 0, 0);
    place(design, "EL-POST", 2000, 0);
    place(design, "EL-CHAIR", 0, 2000);

    const groups = groupStudioLines(design);
    const posts = groups.find((group) => group.typeId === "EL-POST");
    expect(posts?.count).toBe(2);
    expect(groups).toHaveLength(2);
  });

  it("estimates seats from bench length and chair count", () => {
    const design = createEmptyDesign();
    place(design, "EL-BENCH", 0, 0, { widthMm: 1800 });
    place(design, "EL-CHAIR", 3000, 0);
    // 1.8 m of bench at 0.6 m per person, plus one chair.
    expect(estimateSeats(design)).toBe(4);
  });
});

describe("validation", () => {
  it("asks the customer to place something when the canvas is empty", () => {
    const result = evaluateStudioDesign(createEmptyDesign());
    expect(result.messages.map((m) => m.code)).toContain("STUDIO_EMPTY");
  });

  it("always states that the data is placeholder", () => {
    const design = createEmptyDesign();
    place(design, "EL-CHAIR");
    expect(evaluateStudioDesign(design).messages.map((m) => m.code)).toContain(
      "STUDIO_DATA_PLACEHOLDER",
    );
  });

  it("blocks a design where two solid elements overlap", () => {
    const design = createEmptyDesign();
    const a = place(design, "EL-POST", 0, 0);
    const b = place(design, "EL-POST", 0, 0);

    const result = evaluateStudioDesign(design);
    expect(result.status).toBe("incompatible");
    expect(result.blocking).toHaveLength(1);
    // The canvas needs to know exactly which elements to highlight.
    expect(result.blocking[0].affectedIds).toEqual(
      expect.arrayContaining([a.id, b.id]),
    );
  });

  it("warns about a gap too tight to walk through", () => {
    const design = createEmptyDesign();
    place(design, "EL-PLANTER", 0, 0);
    // Second planter 500 mm of clear space away — under the guideline.
    place(design, "EL-PLANTER", 0, 900);

    const codes = evaluateStudioDesign(design).messages.map((m) => m.code);
    expect(codes).toContain("STUDIO_CIRCULATION");
    expect(MIN_CIRCULATION_MM).toBe(600);
  });

  it("does not warn when there is room to walk", () => {
    const design = createEmptyDesign();
    place(design, "EL-PLANTER", 0, 0);
    place(design, "EL-PLANTER", 0, 2000);
    expect(evaluateStudioDesign(design).messages.map((m) => m.code)).not.toContain(
      "STUDIO_CIRCULATION",
    );
  });

  it("escalates a heavy tank to engineering review rather than approving it", () => {
    const design = createEmptyDesign();
    place(design, "EL-AQUARIUM", 0, 0, {
      widthMm: 1800,
      depthMm: 700,
      heightMm: 700,
    });

    const result = evaluateStudioDesign(design);
    expect(result.status).toBe("review_required");
    expect(result.messages.some((m) => m.code.startsWith("STUDIO_AQ_LOAD"))).toBe(true);
    // A review requirement must not block the customer.
    expect(result.blocking).toHaveLength(0);
  });

  it("escalates electrics placed with water", () => {
    const design = createEmptyDesign();
    place(design, "EL-WATER-FEATURE", 0, 0);
    place(design, "EL-PENDANT", 2000, 0);
    expect(evaluateStudioDesign(design).messages.map((m) => m.code)).toContain(
      "STUDIO_ELECTRICAL_WATER",
    );
  });

  it("warns about planting with nothing to grow in", () => {
    const design = createEmptyDesign();
    place(design, "EL-PLANT", 0, 0);
    const codes = evaluateStudioDesign(design).messages.map((m) => m.code);
    expect(codes).toContain("STUDIO_PLANT_NO_CONTAINER");
  });

  it("does not warn when the planting has a planter", () => {
    const design = createEmptyDesign();
    place(design, "EL-PLANTER", 0, 0);
    place(design, "EL-PLANT", 0, 0);
    expect(evaluateStudioDesign(design).messages.map((m) => m.code)).not.toContain(
      "STUDIO_PLANT_NO_CONTAINER",
    );
  });

  it("warns about a beam with nothing holding it up", () => {
    const design = createEmptyDesign();
    place(design, "EL-BEAM", 0, 0);
    expect(evaluateStudioDesign(design).messages.map((m) => m.code)).toContain(
      "STUDIO_BEAM_UNSUPPORTED",
    );
  });

  it("never approves a structural layout", () => {
    const design = createEmptyDesign();
    place(design, "EL-POST", -1500, -1500);
    place(design, "EL-POST", 1500, -1500);

    const result = evaluateStudioDesign(design);
    expect(result.messages.map((m) => m.code)).toContain("STUDIO_STRUCTURE_REVIEW");
    expect(result.status).toBe("review_required");
  });

  it("gives every message a code, a title and a body", () => {
    const design = createEmptyDesign();
    place(design, "EL-AQUARIUM", 0, 0);
    place(design, "EL-PENDANT", 2000, 0);

    for (const entry of evaluateStudioDesign(design).messages) {
      expect(entry.code).toBeTruthy();
      expect(entry.title).toBeTruthy();
      expect(entry.message.length).toBeGreaterThan(10);
    }
  });
});
