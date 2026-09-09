import { SEATING_LAYOUTS } from "../catalog/seating.ts";
import {
  getElementType,
  type AssemblyParams,
  type AssemblyParamSpec,
} from "./catalog.ts";
import { clamp } from "../lib/num.ts";
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
 * Runs around a rectangle
 *
 * Seating, planting and screening all place a run along each chosen side of a
 * rectangle. The *choice* of sides differs — seating reads the guided wizard's
 * own layout list, the others offer a plain option list — but the geometry is
 * one implementation, here, rather than three that can disagree about where a
 * corner is.
 * ------------------------------------------------------------------ */

export type Side = "north" | "south" | "east" | "west";

/** Generic side sets, for assemblies with no wizard counterpart to reuse. */
export const SIDE_SETS: Record<string, Side[]> = {
  perimeter: ["north", "south", "east", "west"],
  three: ["north", "east", "west"],
  opposite: ["north", "south"],
  corner: ["north", "west"],
  one: ["north"],
};

export function sidesForSet(setId: string): Side[] {
  return (SIDE_SETS[setId] ?? SIDE_SETS.perimeter).slice();
}

/** One run: where it sits, how it is turned, and how long it is. */
export type Run = {
  side: Side;
  x: number;
  z: number;
  rotationDeg: number;
  lengthMm: number;
};

/**
 * A run along each named side of a `spanW × spanD` rectangle.
 *
 * North and south runs take the full width; east and west are shortened by one
 * run depth at each end and sit between them, so the corners meet instead of
 * overlapping — which would otherwise be reported as the assembly colliding
 * with itself.
 */
export function runsAroundRect(
  sides: Side[],
  spanW: number,
  spanD: number,
  depth: number,
): Run[] {
  const alongX = spanW;
  const alongZ = Math.max(200, spanD - depth * 2);

  const placement: Record<Side, Omit<Run, "side">> = {
    north: { x: 0, z: -spanD / 2 + depth / 2, rotationDeg: 0, lengthMm: alongX },
    south: { x: 0, z: spanD / 2 - depth / 2, rotationDeg: 0, lengthMm: alongX },
    east: { x: spanW / 2 - depth / 2, z: 0, rotationDeg: 90, lengthMm: alongZ },
    west: { x: -spanW / 2 + depth / 2, z: 0, rotationDeg: 90, lengthMm: alongZ },
  };

  return sides.map((side) => ({ side, ...placement[side] }));
}

/* ------------------------------------------------------------------ *
 * Seating layout
 * ------------------------------------------------------------------ */

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

  return runsAroundRect(sidesForLayout(layoutId), spanW, spanD, depth).map((run) =>
    part(
      assembly,
      `seat-${run.side}`,
      typeId,
      { x: run.x, z: run.z, rotationDeg: run.rotationDeg },
      { widthMm: run.lengthMm, depthMm: depth, heightMm: totalHeight },
      0,
    ),
  );
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
 * Planting border
 * ------------------------------------------------------------------ */

/** Plant spacing along a run, by planting density. Empty beds get none. */
const PLANT_SPACING_MM: Record<string, number> = { full: 700, low: 1400 };

function derivePlanting(assembly: StudioElement): DerivedElement[] {
  const params = resolveParams(assembly);
  const spanW = num(params, "spanW", 3000);
  const spanD = num(params, "spanD", 3000);
  const bedDepth = num(params, "bedDepth", 400);
  const bedHeight = num(params, "bedHeight", 450);
  const planting = text(params, "planting", "full");
  const plantHeight = num(params, "plantHeight", 900);

  const spacing = PLANT_SPACING_MM[planting];
  // Planting sits on the soil and must fit inside the bed it grows in.
  const plantSize = clamp(bedDepth - 100, 300, 900);

  const parts: DerivedElement[] = [];

  for (const run of runsAroundRect(sidesForSet(text(params, "sides", "perimeter")), spanW, spanD, bedDepth)) {
    parts.push(
      part(
        assembly,
        `bed-${run.side}`,
        "EL-PLANTER",
        { x: run.x, z: run.z, rotationDeg: run.rotationDeg },
        { widthMm: run.lengthMm, depthMm: bedDepth, heightMm: bedHeight },
        0,
      ),
    );

    if (!spacing) continue;

    // Plants are spread evenly along the run rather than dropped at a fixed
    // spacing from one end: an even count with a leftover stub at one corner
    // is what makes a generated layout look generated.
    const count = Math.max(1, Math.floor(run.lengthMm / spacing));
    for (let index = 0; index < count; index += 1) {
      const offset = ((index + 0.5) / count - 0.5) * run.lengthMm;
      // The run's own rotation decides which axis "along" means.
      const along =
        run.rotationDeg === 0
          ? { x: run.x + offset, z: run.z }
          : { x: run.x, z: run.z + offset };

      parts.push(
        part(
          assembly,
          `plant-${run.side}-${index}`,
          "EL-PLANT",
          along,
          { widthMm: plantSize, depthMm: plantSize, heightMm: plantHeight },
          bedHeight,
          "COL-MOSS",
        ),
      );
    }
  }

  return parts;
}

function plantingSize(params: AssemblyParams) {
  const bedHeight = num(params, "bedHeight", 450);
  const planted = Boolean(PLANT_SPACING_MM[text(params, "planting", "full")]);
  return {
    widthMm: Math.round(num(params, "spanW", 3000)),
    depthMm: Math.round(num(params, "spanD", 3000)),
    heightMm: Math.round(bedHeight + (planted ? num(params, "plantHeight", 900) : 0)),
  };
}

/* ------------------------------------------------------------------ *
 * Lighting run
 * ------------------------------------------------------------------ */

/** Evenly spaced positions along a span, centred on zero. */
function spread(count: number, span: number): number[] {
  const n = Math.max(1, Math.round(count));
  if (n === 1) return [0];
  return Array.from({ length: n }, (_, index) => -span / 2 + (span / (n - 1)) * index);
}

function deriveLighting(assembly: StudioElement): DerivedElement[] {
  const params = resolveParams(assembly);
  const pattern = text(params, "pattern", "row");
  const fixture = text(params, "fixture", "pendant");
  const spanW = num(params, "spanW", 3000);
  const spanD = num(params, "spanD", 3000);
  const countW = Math.max(1, Math.round(num(params, "countW", 3)));
  const countD = Math.max(1, Math.round(num(params, "countD", 3)));

  const isPendant = fixture === "pendant";
  const typeId = isPendant ? "EL-PENDANT" : "EL-FLOOR-LAMP";
  const size = isPendant
    ? { widthMm: 300, depthMm: 300, heightMm: 300 }
    : { widthMm: 260, depthMm: 260, heightMm: num(params, "lanternHeight", 900) };
  const elevation = isPendant ? num(params, "mountHeight", 2100) : 0;

  const points: { x: number; z: number }[] = [];

  if (pattern === "grid") {
    for (const x of spread(countW, spanW)) {
      for (const z of spread(countD, spanD)) points.push({ x, z });
    }
  } else if (pattern === "perimeter") {
    // Corners belong to one side only, or every corner gets two fixtures in
    // the same place — which reads as a duplicate, and prices as one too.
    const xs = spread(countW, spanW);
    const zs = spread(countW, spanD);
    for (const x of xs) {
      points.push({ x, z: -spanD / 2 }, { x, z: spanD / 2 });
    }
    for (const z of zs.slice(1, -1)) {
      points.push({ x: -spanW / 2, z }, { x: spanW / 2, z });
    }
  } else {
    for (const x of spread(countW, spanW)) points.push({ x, z: 0 });
  }

  return points.map((point, index) =>
    part(assembly, `light-${index}`, typeId, point, size, elevation),
  );
}

function lightingSize(params: AssemblyParams) {
  const pattern = text(params, "pattern", "row");
  const isPendant = text(params, "fixture", "pendant") === "pendant";
  const spanW = num(params, "spanW", 3000);
  const spanD = pattern === "row" ? 300 : num(params, "spanD", 3000);
  const height = isPendant
    ? num(params, "mountHeight", 2100) + 300
    : num(params, "lanternHeight", 900);

  return {
    widthMm: Math.round(spanW),
    depthMm: Math.round(spanD),
    heightMm: Math.round(height),
  };
}

/* ------------------------------------------------------------------ *
 * Screen wall
 * ------------------------------------------------------------------ */

const SCREEN_TYPES: Record<string, string> = {
  screen: "EL-SCREEN",
  trellis: "EL-TRELLIS",
  balustrade: "EL-BALUSTRADE",
};

/**
 * The height a screen wall is actually built at.
 *
 * Each style has its own buildable range, so a screen wall must not be able to
 * place a 3 m balustrade the palette itself would refuse.
 */
function screenHeight(params: AssemblyParams): number {
  const type = getElementType(SCREEN_TYPES[text(params, "style", "screen")] ?? "EL-SCREEN");
  return clamp(
    num(params, "height", 1900),
    type?.resize.height?.minMm ?? 700,
    type?.resize.height?.maxMm ?? 3000,
  );
}

function deriveScreen(assembly: StudioElement): DerivedElement[] {
  const params = resolveParams(assembly);
  const style = text(params, "style", "screen");
  const typeId = SCREEN_TYPES[style] ?? "EL-SCREEN";
  const type = getElementType(typeId);
  const spanW = num(params, "spanW", 3000);
  const spanD = num(params, "spanD", 3000);

  const height = screenHeight(params);
  const thickness = type?.defaultSize.depthMm ?? 80;

  return runsAroundRect(
    sidesForSet(text(params, "sides", "opposite")),
    spanW,
    spanD,
    thickness,
  ).map((run) =>
    part(
      assembly,
      `panel-${run.side}`,
      typeId,
      { x: run.x, z: run.z, rotationDeg: run.rotationDeg },
      { widthMm: run.lengthMm, depthMm: thickness, heightMm: height },
      0,
    ),
  );
}

/** Hold the height to what the chosen style is actually built in. */
function normalizeScreenParams(params: AssemblyParams): AssemblyParams {
  return { ...params, height: screenHeight(params) };
}

function screenSize(params: AssemblyParams) {
  return {
    widthMm: Math.round(num(params, "spanW", 3000)),
    depthMm: Math.round(num(params, "spanD", 3000)),
    heightMm: Math.round(screenHeight(params)),
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
  /**
   * Resolve constraints between parameters, after each has been clamped to its
   * own declared range.
   *
   * A parameter spec describes one control in isolation, so it cannot express
   * "a balustrade may not be 3 m tall even though a screen may". Without this,
   * the slider would sit at 3000 while the wall it built was 1300 — a control
   * that lies is worse than one that is missing.
   */
  normalize?: (params: AssemblyParams) => AssemblyParams;
};

const DERIVERS: Record<string, Deriver> = {
  "ASM-PAVILION": { derive: derivePavilion, size: pavilionSize },
  "ASM-SEATING": { derive: deriveSeating, size: seatingSize },
  "ASM-PLANTING": { derive: derivePlanting, size: plantingSize },
  "ASM-LIGHTING": { derive: deriveLighting, size: lightingSize },
  "ASM-SCREEN": {
    derive: deriveScreen,
    size: screenSize,
    normalize: normalizeScreenParams,
  },
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

  // Each control has now been held to its own range. Constraints *between*
  // controls are the assembly's own business, so it gets the last word.
  return DERIVERS[typeId]?.normalize?.(result) ?? result;
}
