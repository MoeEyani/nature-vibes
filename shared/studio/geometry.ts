import type { StudioDesign, StudioElement, StudioSite } from "./schema.ts";
import { getElementType } from "./catalog.ts";

/**
 * Studio geometry.
 *
 * Pure planar maths on element footprints, in millimetres. Elements can be
 * rotated to any angle, so overlap has to be tested between *oriented*
 * rectangles — an axis-aligned test would report collisions that are not
 * there the moment anything is turned off-axis. The separating axis theorem
 * is the correct tool and is what is used below.
 */

export type Point = { x: number; z: number };
/** Four corners, clockwise from the element's local (-w/2, -d/2). */
export type Footprint = [Point, Point, Point, Point];
export type Rect = { minX: number; maxX: number; minZ: number; maxZ: number };

const DEG_TO_RAD = Math.PI / 180;

/** Snap a value to the nearest multiple of `step`. A step of 0 disables it. */
export function snap(value: number, step: number): number {
  if (!step || step <= 0) return Math.round(value);
  return Math.round(value / step) * step;
}

export function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

/** The element's four ground-plane corners, accounting for its rotation. */
export function footprint(element: StudioElement): Footprint {
  const angle = element.rotationDeg * DEG_TO_RAD;
  const cos = Math.cos(angle);
  const sin = Math.sin(angle);
  const halfW = element.widthMm / 2;
  const halfD = element.depthMm / 2;

  const local: Point[] = [
    { x: -halfW, z: -halfD },
    { x: halfW, z: -halfD },
    { x: halfW, z: halfD },
    { x: -halfW, z: halfD },
  ];

  return local.map((point) => ({
    x: element.x + point.x * cos - point.z * sin,
    z: element.z + point.x * sin + point.z * cos,
  })) as Footprint;
}

/** Axis-aligned bounds of a rotated footprint. */
export function bounds(element: StudioElement): Rect {
  const corners = footprint(element);
  const xs = corners.map((corner) => corner.x);
  const zs = corners.map((corner) => corner.z);
  return {
    minX: Math.min(...xs),
    maxX: Math.max(...xs),
    minZ: Math.min(...zs),
    maxZ: Math.max(...zs),
  };
}

export function rectsIntersect(a: Rect, b: Rect): boolean {
  return a.minX < b.maxX && a.maxX > b.minX && a.minZ < b.maxZ && a.maxZ > b.minZ;
}

/** Vertical extent of an element, from its elevation to its top. */
export function verticalRange(element: StudioElement): { bottom: number; top: number } {
  return {
    bottom: element.elevationMm,
    top: element.elevationMm + element.heightMm,
  };
}

function verticalOverlap(a: StudioElement, b: StudioElement): boolean {
  const rangeA = verticalRange(a);
  const rangeB = verticalRange(b);
  return rangeA.bottom < rangeB.top && rangeA.top > rangeB.bottom;
}

/** Project a polygon onto an axis, returning the interval it covers. */
function project(corners: readonly Point[], axis: Point): { min: number; max: number } {
  let min = Infinity;
  let max = -Infinity;
  for (const corner of corners) {
    const value = corner.x * axis.x + corner.z * axis.z;
    if (value < min) min = value;
    if (value > max) max = value;
  }
  return { min, max };
}

/**
 * Do two oriented footprints overlap?
 *
 * Separating axis theorem: two convex shapes are disjoint exactly when some
 * axis exists on which their projections do not overlap. For rectangles it is
 * enough to test the four edge normals.
 */
export function footprintsOverlap(a: StudioElement, b: StudioElement): boolean {
  // Cheap rejection first — most pairs are far apart.
  if (!rectsIntersect(bounds(a), bounds(b))) return false;

  const cornersA = footprint(a);
  const cornersB = footprint(b);

  const axes: Point[] = [];
  for (const corners of [cornersA, cornersB]) {
    for (let i = 0; i < 2; i += 1) {
      const from = corners[i];
      const to = corners[i + 1];
      // Edge normal.
      const axis = { x: -(to.z - from.z), z: to.x - from.x };
      const length = Math.hypot(axis.x, axis.z) || 1;
      axes.push({ x: axis.x / length, z: axis.z / length });
    }
  }

  for (const axis of axes) {
    const projectionA = project(cornersA, axis);
    const projectionB = project(cornersB, axis);
    if (projectionA.max <= projectionB.min || projectionB.max <= projectionA.min) {
      return false;
    }
  }
  return true;
}

/** True when both elements are solid and share space in plan *and* height. */
export function elementsCollide(a: StudioElement, b: StudioElement): boolean {
  if (a.id === b.id) return false;
  const typeA = getElementType(a.typeId);
  const typeB = getElementType(b.typeId);
  if (!typeA?.solid || !typeB?.solid) return false;
  if (!verticalOverlap(a, b)) return false;
  return footprintsOverlap(a, b);
}

/** Every colliding pair in a design, each reported once. */
export function findCollisions(design: StudioDesign): [StudioElement, StudioElement][] {
  const pairs: [StudioElement, StudioElement][] = [];
  const { elements } = design;
  for (let i = 0; i < elements.length; i += 1) {
    for (let j = i + 1; j < elements.length; j += 1) {
      if (elementsCollide(elements[i], elements[j])) {
        pairs.push([elements[i], elements[j]]);
      }
    }
  }
  return pairs;
}

export const EMPTY_RECT: Rect = { minX: 0, maxX: 0, minZ: 0, maxZ: 0 };

/** Envelope enclosing every element. Zeroed for an empty design. */
export function designBounds(design: StudioDesign): Rect {
  if (design.elements.length === 0) return EMPTY_RECT;

  return design.elements.reduce<Rect>((acc, element) => {
    const rect = bounds(element);
    return {
      minX: Math.min(acc.minX, rect.minX),
      maxX: Math.max(acc.maxX, rect.maxX),
      minZ: Math.min(acc.minZ, rect.minZ),
      maxZ: Math.max(acc.maxZ, rect.maxZ),
    };
  }, bounds(design.elements[0]));
}

export function rectSize(rect: Rect): { widthMm: number; depthMm: number } {
  return { widthMm: rect.maxX - rect.minX, depthMm: rect.maxZ - rect.minZ };
}

/** The site is centred on the origin. */
export function siteRect(site: StudioSite): Rect {
  return {
    minX: -site.widthMm / 2,
    maxX: site.widthMm / 2,
    minZ: -site.depthMm / 2,
    maxZ: site.depthMm / 2,
  };
}

export function isInsideSite(element: StudioElement, site: StudioSite): boolean {
  const rect = bounds(element);
  const limits = siteRect(site);
  return (
    rect.minX >= limits.minX &&
    rect.maxX <= limits.maxX &&
    rect.minZ >= limits.minZ &&
    rect.maxZ <= limits.maxZ
  );
}

/**
 * Keep an element's centre inside the site, allowing for its own size.
 * Used while dragging, so an element cannot be pushed off the plot.
 */
export function clampToSite(
  element: StudioElement,
  site: StudioSite,
): { x: number; z: number } {
  const rect = bounds(element);
  const halfWidth = (rect.maxX - rect.minX) / 2;
  const halfDepth = (rect.maxZ - rect.minZ) / 2;
  const limits = siteRect(site);

  // A element larger than the site simply centres on it.
  const minX = Math.min(limits.minX + halfWidth, 0);
  const maxX = Math.max(limits.maxX - halfWidth, 0);
  const minZ = Math.min(limits.minZ + halfDepth, 0);
  const maxZ = Math.max(limits.maxZ - halfDepth, 0);

  return { x: clamp(element.x, minX, maxX), z: clamp(element.z, minZ, maxZ) };
}

/** Plan area of one element, in square metres. */
export function areaM2(element: StudioElement): number {
  return (element.widthMm / 1000) * (element.depthMm / 1000);
}

/** Longest side in metres — how per-linear-metre items are measured. */
export function runM(element: StudioElement): number {
  return Math.max(element.widthMm, element.depthMm) / 1000;
}

/** Shortest distance from a point to a line segment. */
function pointToSegment(point: Point, from: Point, to: Point): number {
  const dx = to.x - from.x;
  const dz = to.z - from.z;
  const lengthSquared = dx * dx + dz * dz;
  if (lengthSquared === 0) return Math.hypot(point.x - from.x, point.z - from.z);

  const t = clamp(
    ((point.x - from.x) * dx + (point.z - from.z) * dz) / lengthSquared,
    0,
    1,
  );
  return Math.hypot(point.x - (from.x + t * dx), point.z - (from.z + t * dz));
}

function segmentsIntersect(p1: Point, p2: Point, p3: Point, p4: Point): boolean {
  const d = (p2.x - p1.x) * (p4.z - p3.z) - (p2.z - p1.z) * (p4.x - p3.x);
  if (d === 0) return false; // parallel; the endpoint checks cover it

  const u = ((p3.x - p1.x) * (p4.z - p3.z) - (p3.z - p1.z) * (p4.x - p3.x)) / d;
  const v = ((p3.x - p1.x) * (p2.z - p1.z) - (p3.z - p1.z) * (p2.x - p1.x)) / d;
  return u >= 0 && u <= 1 && v >= 0 && v <= 1;
}

function segmentDistance(p1: Point, p2: Point, p3: Point, p4: Point): number {
  if (segmentsIntersect(p1, p2, p3, p4)) return 0;
  return Math.min(
    pointToSegment(p1, p3, p4),
    pointToSegment(p2, p3, p4),
    pointToSegment(p3, p1, p2),
    pointToSegment(p4, p1, p2),
  );
}

/**
 * Smallest clear distance between two footprints, in millimetres.
 * 0 when they touch or overlap.
 *
 * Measured between the *oriented* footprints, edge to edge. Measuring between
 * axis-aligned boxes would report 0 for two rotated elements whose boxes
 * happen to overlap while the elements themselves are well apart — which
 * would silently switch the circulation check off for anything off-axis.
 */
export function gapBetween(a: StudioElement, b: StudioElement): number {
  if (footprintsOverlap(a, b)) return 0;

  const cornersA = footprint(a);
  const cornersB = footprint(b);

  let shortest = Infinity;
  for (let i = 0; i < 4; i += 1) {
    const a1 = cornersA[i];
    const a2 = cornersA[(i + 1) % 4];
    for (let j = 0; j < 4; j += 1) {
      const b1 = cornersB[j];
      const b2 = cornersB[(j + 1) % 4];
      const distance = segmentDistance(a1, a2, b1, b2);
      if (distance < shortest) shortest = distance;
    }
  }
  return shortest;
}
