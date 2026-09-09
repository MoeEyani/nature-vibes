import { createConfigurationId, createElementId } from "../lib/id.ts";
import {
  getElementType,
  type AssemblyParams,
  type StudioElementType,
} from "./catalog.ts";
import {
  assemblySize,
  clampParams,
  deriveParts,
  isAssembly,
} from "./assemblies.ts";
import { clamp, clampToSite, elementsCollide, snap } from "./geometry.ts";
import {
  DEFAULT_GRID_MM,
  DEFAULT_SITE,
  type StudioDesign,
  type StudioElement,
} from "./schema.ts";

/**
 * Creating and mutating a studio design.
 *
 * Pure functions returning new objects — the store applies them, and the
 * trusted boundary could apply the same ones, exactly as the configurator's
 * `normalizeConfiguration` works.
 */

export function createEmptyDesign(): StudioDesign {
  const now = new Date().toISOString();
  return {
    id: createConfigurationId(),
    schemaVersion: 1,
    createdAt: now,
    updatedAt: now,
    site: { ...DEFAULT_SITE },
    gridMm: DEFAULT_GRID_MM,
    elements: [],
  };
}

/** Place a new element of `typeId` centred on (x, z), snapped to the grid. */
export function createElement(
  typeId: string,
  position: { x: number; z: number },
  design: StudioDesign,
): StudioElement | null {
  const type = getElementType(typeId);
  if (!type) return null;

  // An assembly's size is not chosen — it follows from its parameters.
  const params = type.assembly ? clampParams(typeId, type.assembly.defaults) : undefined;
  const size = params ? assemblySize(typeId, params) : null;

  const element: StudioElement = {
    id: createElementId(),
    typeId,
    x: snap(position.x, design.gridMm),
    z: snap(position.z, design.gridMm),
    rotationDeg: 0,
    widthMm: size?.widthMm ?? type.defaultSize.widthMm,
    depthMm: size?.depthMm ?? type.defaultSize.depthMm,
    heightMm: size?.heightMm ?? type.defaultSize.heightMm,
    elevationMm: type.defaultElevationMm,
    colorId: type.colorIds[0],
    locked: false,
    ...(params ? { params } : {}),
  };

  const clamped = clampToSite(element, design.site);
  return { ...element, ...clamped };
}

/** Snap a raw pointer position to the design's grid. */
export function snapPosition(
  position: { x: number; z: number },
  design: StudioDesign,
): { x: number; z: number } {
  return {
    x: snap(position.x, design.gridMm),
    z: snap(position.z, design.gridMm),
  };
}

export type ElementPatch = Partial<
  Pick<
    StudioElement,
    | "x"
    | "z"
    | "rotationDeg"
    | "widthMm"
    | "depthMm"
    | "heightMm"
    | "elevationMm"
    | "colorId"
    | "label"
    | "locked"
    | "params"
  >
>;

/**
 * Apply a patch, holding every value inside what its type permits.
 *
 * The properties panel writes through here rather than setting fields
 * directly, so a hand-typed number can never put an element outside its
 * buildable range.
 */
export function applyPatch(
  element: StudioElement,
  patch: ElementPatch,
  design: StudioDesign,
): StudioElement {
  const type = getElementType(element.typeId);
  if (!type) return element;

  const next: StudioElement = { ...element, ...patch };

  // An assembly is edited through its parameters; its footprint is a result,
  // never an input, so a stray width patch must not be able to desync it.
  if (type.assembly) {
    const params = clampParams(element.typeId, {
      ...(element.params ?? {}),
      ...((patch.params ?? {}) as AssemblyParams),
    });
    const size = assemblySize(element.typeId, params);

    const resized: StudioElement = {
      ...next,
      params,
      widthMm: size?.widthMm ?? element.widthMm,
      depthMm: size?.depthMm ?? element.depthMm,
      heightMm: size?.heightMm ?? element.heightMm,
      elevationMm: type.defaultElevationMm,
      rotationDeg: ((Math.round(next.rotationDeg) % 360) + 360) % 360,
      x: patch.x !== undefined ? Math.round(next.x) : next.x,
      z: patch.z !== undefined ? Math.round(next.z) : next.z,
    };
    return { ...resized, ...clampToSite(resized, design.site) };
  }

  next.widthMm = clampDimension(next.widthMm, type.resize.width, element.widthMm);
  next.depthMm = clampDimension(next.depthMm, type.resize.depth, element.depthMm);
  next.heightMm = clampDimension(next.heightMm, type.resize.height, element.heightMm);
  next.elevationMm = type.elevation
    ? clamp(Math.round(next.elevationMm), type.elevation.minMm, type.elevation.maxMm)
    : type.defaultElevationMm;

  // Keep rotation in [0, 360) so the UI never shows -0 or 720.
  next.rotationDeg = ((Math.round(next.rotationDeg) % 360) + 360) % 360;

  if (next.colorId && !type.colorIds.includes(next.colorId)) {
    next.colorId = element.colorId ?? type.colorIds[0];
  }

  if (patch.x !== undefined) next.x = Math.round(next.x);
  if (patch.z !== undefined) next.z = Math.round(next.z);

  const clamped = clampToSite(next, design.site);
  return { ...next, x: clamped.x, z: clamped.z };
}

function clampDimension(
  value: number,
  range: { minMm: number; maxMm: number } | undefined,
  fallback: number,
): number {
  // A dimension the type does not offer for resizing stays where it was.
  if (!range) return fallback;
  return clamp(Math.round(value), range.minMm, range.maxMm);
}

/**
 * Find a free spot for a new element, searching outward from the centre.
 *
 * Dropping every tapped element on the exact centre guarantees a pile of
 * overlapping elements and an immediately invalid design. Rings of candidate
 * positions are tried until one is clear, so tapping repeatedly lays elements
 * out instead of stacking them.
 */
export function findFreeSpot(
  design: StudioDesign,
  typeId: string,
): { x: number; z: number } {
  const type = getElementType(typeId);
  if (!type) return { x: 0, z: 0 };

  const step = Math.max(
    design.gridMm || 100,
    Math.round(Math.max(type.defaultSize.widthMm, type.defaultSize.depthMm) * 0.75),
  );

  const probe = (x: number, z: number): boolean => {
    const candidate = createBareElement(type, x, z);
    return !design.elements.some((element) => elementsCollide(candidate, element));
  };

  if (probe(0, 0)) return { x: 0, z: 0 };

  // Expanding square rings around the origin.
  for (let ring = 1; ring <= 8; ring += 1) {
    for (let dx = -ring; dx <= ring; dx += 1) {
      for (let dz = -ring; dz <= ring; dz += 1) {
        // Only the perimeter of this ring; inner ones were already tried.
        if (Math.abs(dx) !== ring && Math.abs(dz) !== ring) continue;
        const x = dx * step;
        const z = dz * step;
        if (probe(x, z)) return { x, z };
      }
    }
  }

  return { x: 0, z: 0 };
}

/** A throwaway element used only for collision probing. */
function createBareElement(
  type: StudioElementType,
  x: number,
  z: number,
): StudioElement {
  return {
    id: "__probe__",
    typeId: type.id,
    x,
    z,
    rotationDeg: 0,
    widthMm: type.defaultSize.widthMm,
    depthMm: type.defaultSize.depthMm,
    heightMm: type.defaultSize.heightMm,
    elevationMm: type.defaultElevationMm,
    locked: false,
  };
}

/** Copy an element, offset by one grid step so it is visibly separate. */
export function duplicateElement(
  element: StudioElement,
  design: StudioDesign,
): StudioElement {
  const offset = Math.max(design.gridMm, 100) * 2;
  const copy: StudioElement = {
    ...element,
    id: createElementId(),
    x: element.x + offset,
    z: element.z + offset,
    locked: false,
  };
  return { ...copy, ...clampToSite(copy, design.site) };
}

/**
 * Turn an assembly into the loose elements it stands for.
 *
 * A one-way door, deliberately: once exploded the parts are free to be moved
 * and edited individually, and the parametric link is gone. That is simpler to
 * reason about — and to undo — than a half-linked hybrid.
 */
export function explodeAssembly(
  element: StudioElement,
  design: StudioDesign,
): StudioElement[] {
  if (!isAssembly(element)) return [element];

  return deriveParts(element).map((partElement) => {
    const loose: StudioElement = {
      ...partElement,
      id: createElementId(),
      locked: false,
    };
    // `parentId` only exists on derived parts; a loose element must not carry it.
    delete (loose as { parentId?: string }).parentId;
    return { ...loose, ...clampToSite(loose, design.site) };
  });
}

/**
 * Copy a set of elements into a design.
 *
 * Fresh ids, offset by one visible step so the copy does not hide under the
 * original, and clamped to the site. The relative arrangement is preserved —
 * pasting six elements that formed a corner must give back a corner, not six
 * elements in a heap — so the whole set moves by one offset rather than each
 * element being placed independently.
 */
export function pasteElements(
  elements: StudioElement[],
  design: StudioDesign,
  offsetMm?: number,
): StudioElement[] {
  const offset = offsetMm ?? Math.max(design.gridMm, 100) * 2;

  return elements
    .filter((element) => Boolean(getElementType(element.typeId)))
    .map((element) => {
      const copy: StudioElement = {
        ...element,
        id: createElementId(),
        x: element.x + offset,
        z: element.z + offset,
        locked: false,
      };
      // `parentId` marks a derived part. A pasted element is its own thing.
      delete (copy as { parentId?: string }).parentId;
      return { ...copy, ...clampToSite(copy, design.site) };
    });
}

/**
 * Re-apply the domain invariants to a design that came from storage: drop
 * unknown types, and pull every element back inside its permitted ranges.
 */
export function normalizeDesign(design: StudioDesign): StudioDesign {
  const elements = design.elements
    .filter((element) => Boolean(getElementType(element.typeId)))
    .map((element) => applyPatch(element, {}, design));

  return { ...design, elements };
}

/** Every element type currently used, for the summary. */
export function usedTypes(design: StudioDesign): StudioElementType[] {
  const seen = new Set<string>();
  const types: StudioElementType[] = [];
  for (const element of design.elements) {
    if (seen.has(element.typeId)) continue;
    const type = getElementType(element.typeId);
    if (type) {
      types.push(type);
      seen.add(element.typeId);
    }
  }
  return types;
}
