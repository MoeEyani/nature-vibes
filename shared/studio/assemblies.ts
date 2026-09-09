import { SEATING_LAYOUTS } from "../catalog/seating.ts";
import {
  getElementType,
  type AssemblyParams,
  type AssemblyParamSpec,
} from "./catalog.ts";
import type { StudioDesign, StudioElement } from "./schema.ts";

/**
 * Parametric assemblies — the "dynamic group".
 *
 * An assembly stores parameters and derives its parts. Nothing is stored twice,
 * so there is no synchronisation to drift: change the span and the posts are
 * simply computed somewhere else next time.
 *
 * Everything downstream — pricing, rules, collision, the 3D scene — works on
 * `expandDesign()`, which replaces each assembly with its parts. That is what
 * keeps the bill of materials honest: a pavilion costs the sum of its posts,
 * beams and roof, never an invented lump sum.
 */

/** A part produced by an assembly. Never persisted. */
export type DerivedElement = StudioElement & { parentId: string };

const DEG_TO_RAD = Math.PI / 180;

/** Place a part given in assembly-local coordinates into world coordinates. */
function place(
  assembly: StudioElement,
  localX: number,
  localZ: number,
  localRotationDeg: number,
): { x: number; z: number; rotationDeg: number } {
  const angle = assembly.rotationDeg * DEG_TO_RAD;
  const cos = Math.cos(angle);
  const sin = Math.sin(angle);
  return {
    x: Math.round(assembly.x + localX * cos - localZ * sin),
    z: Math.round(assembly.z + localX * sin + localZ * cos),
    rotationDeg: (assembly.rotationDeg + localRotationDeg + 360) % 360,
  };
}

function part(
  assembly: StudioElement,
  index: string,
  typeId: string,
  local: { x: number; z: number; rotationDeg?: number },
  size: { widthMm: number; depthMm: number; heightMm: number },
  elevationMm: number,
  colorId?: string,
): DerivedElement {
  const placed = place(assembly, local.x, local.z, local.rotationDeg ?? 0);
  return {
    id: `${assembly.id}:${index}`,
    parentId: assembly.id,
    typeId,
    x: placed.x,
    z: placed.z,
    rotationDeg: placed.rotationDeg,
    widthMm: Math.max(1, Math.round(size.widthMm)),
    depthMm: Math.max(1, Math.round(size.depthMm)),
    heightMm: Math.max(1, Math.round(size.heightMm)),
    elevationMm: Math.max(0, Math.round(elevationMm)),
    colorId: colorId ?? assembly.colorId,
    locked: false,
  };
}

function num(params: AssemblyParams, key: string, fallback: number): number {
  const value = params[key];
  return typeof value === "number" && Number.isFinite(value) ? value : fallback;
}

function text(params: AssemblyParams, key: string, fallback: string): string {
  const value = params[key];
  return typeof value === "string" ? value : fallback;
}

/** Resolved parameters, with the type's defaults filled in. */
export function resolveParams(element: StudioElement): AssemblyParams {
  const spec = getElementType(element.typeId)?.assembly;
  if (!spec) return {};
  return { ...spec.defaults, ...(element.params ?? {}) };
}

/* ------------------------------------------------------------------ *
 * Pavilion
 * ------------------------------------------------------------------ */

function derivePavilion(assembly: StudioElement): DerivedElement[] {
  const params = resolveParams(assembly);
  const spanW = num(params, "spanW", 3000);
  const spanD = num(params, "spanD", 3000);
  const eave = num(params, "eaveHeight", 2600);
  const overhang = num(params, "overhang", 300);
  const baysW = Math.max(1, Math.round(num(params, "baysW", 1)));
  const baysD = Math.max(1, Math.round(num(params, "baysD", 1)));
  const section = num(params, "postSection", 100);
  const style = text(params, "roofStyle", "pyramid");

  const parts: DerivedElement[] = [];

  // Posts on the perimeter of the bay grid. Interior posts would stand in the
  // middle of the space, which is not what a pavilion is.
  for (let i = 0; i <= baysW; i += 1) {
    for (let j = 0; j <= baysD; j += 1) {
      const onPerimeter = i === 0 || i === baysW || j === 0 || j === baysD;
      if (!onPerimeter) continue;

      const x = -spanW / 2 + (spanW / baysW) * i;
      const z = -spanD / 2 + (spanD / baysD) * j;
      parts.push(
        part(
          assembly,
          `post-${i}-${j}`,
          "EL-POST",
          { x, z },
          { widthMm: section, depthMm: section, heightMm: eave },
          0,
        ),
      );
    }
  }

  // Perimeter beams, sitting so their top lands on the eave line.
  const beamHeight = 160;
  const beamTop = Math.max(0, eave - beamHeight);
  for (const z of [-spanD / 2, spanD / 2]) {
    parts.push(
      part(
        assembly,
        `beam-x-${z}`,
        "EL-BEAM",
        { x: 0, z },
        { widthMm: spanW, depthMm: section, heightMm: beamHeight },
        beamTop,
      ),
    );
  }
  for (const x of [-spanW / 2, spanW / 2]) {
    parts.push(
      part(
        assembly,
        `beam-z-${x}`,
        "EL-BEAM",
        { x, z: 0, rotationDeg: 90 },
        { widthMm: spanD, depthMm: section, heightMm: beamHeight },
        beamTop,
      ),
    );
  }

  // The roof is a catalogued part in its own right, so it shows up in the
  // breakdown with its own SKU and per-square-metre price.
  const roofTypeId = `EL-ROOF-${style.toUpperCase()}`;
  const roofType = getElementType(roofTypeId);
  if (roofType) {
    parts.push(
      part(
        assembly,
        "roof",
        roofTypeId,
        { x: 0, z: 0 },
        {
          widthMm: spanW + overhang * 2,
          depthMm: spanD + overhang * 2,
          heightMm: roofType.defaultSize.heightMm,
        },
        eave,
      ),
    );
  }

  return parts;
}

function pavilionSize(params: AssemblyParams) {
  const spanW = num(params, "spanW", 3000);
  const spanD = num(params, "spanD", 3000);
  const overhang = num(params, "overhang", 300);
  const eave = num(params, "eaveHeight", 2600);
  const style = text(params, "roofStyle", "pyramid");
  const peak =
    getElementType(`EL-ROOF-${style.toUpperCase()}`)?.defaultSize.heightMm ?? 200;

  return {
    widthMm: Math.round(spanW + overhang * 2),
    depthMm: Math.round(spanD + overhang * 2),
    heightMm: Math.round(eave + peak),
  };
}

/* ------------------------------------------------------------------ *
 * Seating layout
 * ------------------------------------------------------------------ */

type Side = "north" | "south" | "east" | "west";

/** The sides a layout builds, read from the wizard's own seating catalog. */
export function sidesForLayout(layoutId: string): Side[] {
  const layout = SEATING_LAYOUTS.find((entry) => entry.id === layoutId);
  return ((layout?.meta?.sides as Side[] | undefined) ?? []).slice();
}

function deriveSeating(assembly: StudioElement): DerivedElement[] {
  const params = resolveParams(assembly);
  const layoutId = text(params, "layoutId", "SEAT-PERIMETER");
  const spanW = num(params, "spanW", 3000);
  const spanD = num(params, "spanD", 3000);
  const depth = num(params, "seatDepth", 550);
  const seatHeight = num(params, "seatHeight", 450);
  const style = text(params, "style", "bench");

  const isLounge = style === "lounge";
  const typeId = isLounge ? "EL-LOUNGE" : "EL-BENCH";
  // The lounge geometry puts its seat at 55% of its overall height, so work
  // back from the seat height the customer asked for.
  const totalHeight = isLounge ? Math.round(seatHeight / 0.55) : seatHeight;

  // North and south runs take the full width; east and west sit between them,
  // so the corners meet without the runs overlapping each other.
  const runAlongX = spanW;
  const runAlongZ = Math.max(200, spanD - depth * 2);

  const layout: Record<Side, { x: number; z: number; rot: number; run: number }> = {
    north: { x: 0, z: -spanD / 2 + depth / 2, rot: 0, run: runAlongX },
    south: { x: 0, z: spanD / 2 - depth / 2, rot: 0, run: runAlongX },
    east: { x: spanW / 2 - depth / 2, z: 0, rot: 90, run: runAlongZ },
    west: { x: -spanW / 2 + depth / 2, z: 0, rot: 90, run: runAlongZ },
  };

  return sidesForLayout(layoutId).map((side) => {
    const entry = layout[side];
    return part(
      assembly,
      `seat-${side}`,
      typeId,
      { x: entry.x, z: entry.z, rotationDeg: entry.rot },
      { widthMm: entry.run, depthMm: depth, heightMm: totalHeight },
      0,
    );
  });
}

function seatingSize(params: AssemblyParams) {
  const style = text(params, "style", "bench");
  const seatHeight = num(params, "seatHeight", 450);
  return {
    widthMm: Math.round(num(params, "spanW", 3000)),
    depthMm: Math.round(num(params, "spanD", 3000)),
    heightMm: Math.round(style === "lounge" ? seatHeight / 0.55 : seatHeight),
  };
}

/* ------------------------------------------------------------------ *
 * Registry
 * ------------------------------------------------------------------ */

type Deriver = {
  derive: (assembly: StudioElement) => DerivedElement[];
  size: (params: AssemblyParams) => {
    widthMm: number;
    depthMm: number;
    heightMm: number;
  };
};

const DERIVERS: Record<string, Deriver> = {
  "ASM-PAVILION": { derive: derivePavilion, size: pavilionSize },
  "ASM-SEATING": { derive: deriveSeating, size: seatingSize },
};

export function isAssembly(element: StudioElement): boolean {
  return Boolean(getElementType(element.typeId)?.assembly);
}

/** The parts an assembly resolves to. Empty for a plain element. */
export function deriveParts(element: StudioElement): DerivedElement[] {
  const deriver = DERIVERS[element.typeId];
  if (!deriver) return [];
  return deriver.derive(element);
}

/** The bounding size implied by an assembly's parameters. */
export function assemblySize(
  typeId: string,
  params: AssemblyParams,
): { widthMm: number; depthMm: number; heightMm: number } | null {
  const deriver = DERIVERS[typeId];
  if (!deriver) return null;
  return deriver.size(params);
}

/**
 * The design as a flat list of real parts.
 *
 * Pricing, rules, collision and the scene all consume this rather than
 * `design.elements`, so an assembly behaves exactly like the parts it stands
 * for and nothing has to special-case it.
 */
export function expandDesign(design: StudioDesign): StudioElement[] {
  return design.elements.flatMap((element) =>
    isAssembly(element) ? deriveParts(element) : [element],
  );
}

/**
 * The parts an assembly type produces at its default parameters.
 *
 * Lets the palette quote a "from" price without a design to hand — an
 * assembly has no price of its own, so quoting `type.price` would show zero.
 */
export function defaultParts(typeId: string): DerivedElement[] {
  const type = getElementType(typeId);
  if (!type?.assembly) return [];

  const params = clampParams(typeId, type.assembly.defaults);
  const size = assemblySize(typeId, params);
  return deriveParts({
    id: typeId,
    typeId,
    x: 0,
    z: 0,
    rotationDeg: 0,
    widthMm: size?.widthMm ?? type.defaultSize.widthMm,
    depthMm: size?.depthMm ?? type.defaultSize.depthMm,
    heightMm: size?.heightMm ?? type.defaultSize.heightMm,
    elevationMm: type.defaultElevationMm,
    colorId: type.colorIds[0],
    locked: false,
    params,
  });
}

/** The parent assembly of a derived part, if it has one. */
export function parentOf(element: StudioElement): string | undefined {
  return (element as DerivedElement).parentId;
}

/** Clamp one parameter to what its spec allows. */
export function clampParam(
  spec: AssemblyParamSpec,
  value: number | string,
): number | string {
  if (spec.kind === "choice") {
    const allowed = spec.options.some((option) => option.value === value);
    return allowed ? value : spec.options[0].value;
  }

  const numeric = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(numeric)) return spec.minMm;
  const stepped = Math.round(numeric / spec.stepMm) * spec.stepMm;
  return Math.min(Math.max(stepped, spec.minMm), spec.maxMm);
}

/** Clamp a whole parameter set, dropping anything the type does not declare. */
export function clampParams(
  typeId: string,
  params: AssemblyParams,
): AssemblyParams {
  const spec = getElementType(typeId)?.assembly;
  if (!spec) return {};

  const result: AssemblyParams = {};
  for (const paramSpec of spec.params) {
    const raw = params[paramSpec.key] ?? spec.defaults[paramSpec.key];
    result[paramSpec.key] = clampParam(paramSpec, raw);
  }
  return result;
}
