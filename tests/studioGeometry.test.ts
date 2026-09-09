import { describe, expect, it } from "vitest";
import {
  areaM2,
  bounds,
  clampToSite,
  designBounds,
  elementsCollide,
  findCollisions,
  footprint,
  footprintsOverlap,
  gapBetween,
  isInsideSite,
  rectSize,
  runM,
  snap,
} from "@shared/studio/geometry";
import { createElement, createEmptyDesign } from "@shared/studio/design";
import type { StudioDesign, StudioElement } from "@shared/studio/schema";

function place(
  design: StudioDesign,
  typeId: string,
  x: number,
  z: number,
  patch: Partial<StudioElement> = {},
): StudioElement {
  const element = createElement(typeId, { x, z }, design);
  if (!element) throw new Error(`unknown type ${typeId}`);
  const placed = { ...element, ...patch };
  design.elements.push(placed);
  return placed;
}

describe("snapping", () => {
  it("snaps to the nearest multiple", () => {
    expect(snap(1234, 100)).toBe(1200);
    expect(snap(1250, 100)).toBe(1300);
    expect(snap(-1234, 100)).toBe(-1200);
  });

  it("rounds to whole millimetres when snapping is off", () => {
    expect(snap(1234.6, 0)).toBe(1235);
  });
});

describe("footprints", () => {
  it("gives four corners around the element centre", () => {
    const design = createEmptyDesign();
    const element = place(design, "EL-TABLE", 0, 0);
    const corners = footprint(element);

    expect(corners).toHaveLength(4);
    const rect = bounds(element);
    expect(rect.maxX - rect.minX).toBeCloseTo(element.widthMm, 6);
    expect(rect.maxZ - rect.minZ).toBeCloseTo(element.depthMm, 6);
  });

  it("swaps the bounding box when rotated a quarter turn", () => {
    const design = createEmptyDesign();
    const element = place(design, "EL-TABLE", 0, 0, { rotationDeg: 90 });
    const rect = bounds(element);

    // A 1400 x 800 table turned 90° occupies 800 x 1400.
    expect(rect.maxX - rect.minX).toBeCloseTo(element.depthMm, 6);
    expect(rect.maxZ - rect.minZ).toBeCloseTo(element.widthMm, 6);
  });
});

describe("overlap", () => {
  it("detects two elements in the same place", () => {
    const design = createEmptyDesign();
    const a = place(design, "EL-POST", 0, 0);
    const b = place(design, "EL-POST", 0, 0);
    expect(footprintsOverlap(a, b)).toBe(true);
    expect(elementsCollide(a, b)).toBe(true);
  });

  it("does not report elements that are merely near each other", () => {
    const design = createEmptyDesign();
    const a = place(design, "EL-POST", 0, 0);
    const b = place(design, "EL-POST", 1000, 0);
    expect(elementsCollide(a, b)).toBe(false);
  });

  it("is not fooled by rotation, where an axis-aligned test would be", () => {
    const design = createEmptyDesign();
    // Two long thin benches on perpendicular diagonals. Their axis-aligned
    // boxes genuinely overlap in the corner between them; the benches
    // themselves are ~200 mm apart at the nearest point.
    const a = place(design, "EL-BENCH", 0, 0, {
      widthMm: 1800,
      depthMm: 300,
      rotationDeg: 45,
    });
    const b = place(design, "EL-BENCH", 1000, 1000, {
      widthMm: 1800,
      depthMm: 300,
      rotationDeg: 135,
    });

    // The cheap box test says these interact...
    const boxA = bounds(a);
    const boxB = bounds(b);
    const boxesTouch =
      boxA.maxX > boxB.minX &&
      boxB.maxX > boxA.minX &&
      boxA.maxZ > boxB.minZ &&
      boxB.maxZ > boxA.minZ;
    expect(boxesTouch).toBe(true);

    // ...but the oriented test correctly says they do not.
    expect(footprintsOverlap(a, b)).toBe(false);
    expect(gapBetween(a, b)).toBeGreaterThan(0);
  });

  it("ignores collisions between elements at different heights", () => {
    const design = createEmptyDesign();
    const table = place(design, "EL-TABLE", 0, 0);
    // A pendant hanging above the table is not a collision.
    const pendant = place(design, "EL-PENDANT", 0, 0);
    expect(pendant.elevationMm).toBeGreaterThan(table.heightMm);
    expect(elementsCollide(table, pendant)).toBe(false);
  });

  it("ignores non-solid elements such as planting", () => {
    const design = createEmptyDesign();
    const planter = place(design, "EL-PLANTER", 0, 0);
    const plant = place(design, "EL-PLANT", 0, 0);
    // A plant sitting in its planter is exactly what should happen.
    expect(elementsCollide(planter, plant)).toBe(false);
  });

  it("reports each colliding pair once", () => {
    const design = createEmptyDesign();
    place(design, "EL-POST", 0, 0);
    place(design, "EL-POST", 0, 0);
    place(design, "EL-POST", 5000, 5000);
    expect(findCollisions(design)).toHaveLength(1);
  });
});

describe("gaps", () => {
  it("measures the clear distance between two footprints", () => {
    const design = createEmptyDesign();
    // Two 100 mm posts, centres 1000 mm apart => 900 mm of clear space.
    const a = place(design, "EL-POST", 0, 0);
    const b = place(design, "EL-POST", 1000, 0);
    expect(gapBetween(a, b)).toBeCloseTo(900, 6);
  });

  it("is zero when the elements overlap", () => {
    const design = createEmptyDesign();
    const a = place(design, "EL-POST", 0, 0);
    const b = place(design, "EL-POST", 0, 0);
    expect(gapBetween(a, b)).toBe(0);
  });
});

describe("the site", () => {
  it("keeps a dragged element inside the working area", () => {
    const design = createEmptyDesign();
    const element = place(design, "EL-TABLE", 999_00, 0);
    const clamped = clampToSite(element, design.site);

    const moved = { ...element, ...clamped };
    expect(isInsideSite(moved, design.site)).toBe(true);
  });

  it("knows when an element hangs over the edge", () => {
    const design = createEmptyDesign();
    // Placement clamps, so push it out deliberately — this is the state a
    // stored design could be in after the site was shrunk.
    const element = place(design, "EL-DECK", 0, 0, {
      x: design.site.widthMm / 2,
    });
    expect(isInsideSite(element, design.site)).toBe(false);
  });

  it("clamps rather than rejecting, so dragging never loses an element", () => {
    const design = createEmptyDesign();
    const element = place(design, "EL-DECK", 0, 0);
    const pushedOut = { ...element, x: 999_000 };
    const clamped = { ...pushedOut, ...clampToSite(pushedOut, design.site) };
    expect(isInsideSite(clamped, design.site)).toBe(true);
  });
});

describe("design envelope", () => {
  it("is zero for an empty design", () => {
    const design = createEmptyDesign();
    expect(rectSize(designBounds(design))).toEqual({ widthMm: 0, depthMm: 0 });
  });

  it("encloses every element", () => {
    const design = createEmptyDesign();
    place(design, "EL-POST", -1500, -1500);
    place(design, "EL-POST", 1500, 1500);

    const size = rectSize(designBounds(design));
    // 3000 mm between centres plus half a post at each end.
    expect(size.widthMm).toBeCloseTo(3100, 6);
    expect(size.depthMm).toBeCloseTo(3100, 6);
  });
});

describe("measures used by pricing", () => {
  it("computes footprint area in square metres", () => {
    const design = createEmptyDesign();
    const deck = place(design, "EL-DECK", 0, 0);
    expect(areaM2(deck)).toBeCloseTo(9, 6);
  });

  it("takes the longest side as the run length", () => {
    const design = createEmptyDesign();
    const bench = place(design, "EL-BENCH", 0, 0);
    expect(runM(bench)).toBeCloseTo(1.8, 6);
  });
});
