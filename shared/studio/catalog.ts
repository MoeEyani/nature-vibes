import type { Price } from "../types/catalog.ts";

/**
 * The studio palette.
 *
 * One record per placeable element type. Sizes, prices and colours are all
 * placeholder seed values — the same discipline as the product catalog.
 *
 * `solid` decides whether an element participates in overlap checking: two
 * posts cannot occupy the same place, but a plant sitting in a planter or a
 * light above a table is perfectly normal.
 */

export type StudioElementKind =
  | "post"
  | "bench"
  | "chair"
  | "table"
  | "planter"
  | "aquarium"
  | "screen"
  | "light"
  | "plant"
  | "deck";

export type StudioGroup =
  | "Assemblies"
  | "Structure"
  | "Seating"
  | "Surfaces"
  | "Greenery"
  | "Water"
  | "Enclosure"
  | "Lighting";

export type SizeRange = { minMm: number; maxMm: number; stepMm: number };

/**
 * A parametric assembly — the "dynamic group".
 *
 * An assembly stores *parameters*, not children. Its posts, beams and roof are
 * derived from those parameters every time they are needed, so changing the
 * span moves the posts with no synchronisation to go wrong and nothing to get
 * out of step. `shared/studio/assemblies.ts` holds the derivation.
 *
 * The parameter specs live here, as data, so the properties panel can render
 * controls for any assembly without knowing what it is.
 */
/**
 * Show this control only while another parameter holds a given value.
 *
 * A control that silently does nothing is worse than one that is not there:
 * a hanging height means nothing to a floor lantern, and a slider that moves
 * without changing anything reads as a broken tool. Declared as data so the
 * panel stays generic.
 */
export type AssemblyParamVisibility = { key: string; equals: string };

export type AssemblyParamSpec =
  | {
      kind: "number";
      key: string;
      label: string;
      minMm: number;
      maxMm: number;
      stepMm: number;
      /** `mm` shows a millimetre box; `count` shows a plain integer. */
      unit: "mm" | "count";
      showWhen?: AssemblyParamVisibility;
    }
  | {
      kind: "choice";
      key: string;
      label: string;
      options: { value: string; label: string }[];
      showWhen?: AssemblyParamVisibility;
    };

export type AssemblyParams = Record<string, number | string>;

export type AssemblySpec = {
  params: AssemblyParamSpec[];
  defaults: AssemblyParams;
};

export type StudioElementType = {
  id: string;
  sku?: string;
  kind: StudioElementKind;
  group: StudioGroup;
  name: string;
  description: string;
  /** Size applied when the element is first placed. */
  defaultSize: { widthMm: number; depthMm: number; heightMm: number };
  /** Which dimensions the customer may change, and within what range. */
  resize: {
    width?: SizeRange;
    depth?: SizeRange;
    height?: SizeRange;
  };
  /** Base height above the floor. Hanging and wall items sit above zero. */
  defaultElevationMm: number;
  elevation?: SizeRange;
  /** Takes part in overlap checking. */
  solid: boolean;
  /** Finish ids offered for this type; the first is the default. */
  colorIds: string[];
  price: Price;
  /** How the price scales. */
  priceMode: "perUnit" | "perSquareMetre" | "perLinearMetre";
  /** Stable key the 3D layer maps to geometry, as elsewhere in the project. */
  assetKey: string;
  /**
   * Hidden types are derived parts of an assembly, never offered in the
   * palette on their own.
   */
  hidden?: boolean;
  /** Present on assemblies. Their size is derived from these, not set. */
  assembly?: AssemblySpec;
  /** Seating capacity contribution, for the summary. Estimated, not certified. */
  seats?: number;
  meta?: Record<string, unknown>;
};

const placeholder = (amount: number): Price => ({
  amount,
  currency: "SAR",
  status: "placeholder",
});

export const STUDIO_COLORS: { id: string; name: string; hex: string }[] = [
  { id: "COL-MATTE-BLACK", name: "Matte Black", hex: "#22262a" },
  { id: "COL-BRONZE", name: "Bronze", hex: "#7a5230" },
  { id: "COL-STONE", name: "Stone Grey", hex: "#6a6f71" },
  { id: "COL-WARM-WHITE", name: "Warm White", hex: "#eee8dc" },
  { id: "COL-TEAK", name: "Teak", hex: "#96643a" },
  { id: "COL-WALNUT", name: "Walnut", hex: "#5b4130" },
  { id: "COL-SAND", name: "Sand", hex: "#ddd2ba" },
  { id: "COL-OLIVE", name: "Olive", hex: "#7d8261" },
  { id: "COL-TERRACOTTA", name: "Terracotta", hex: "#a9613f" },
  { id: "COL-MOSS", name: "Moss", hex: "#5f8f4a" },
];

export const STUDIO_COLOR_INDEX = Object.fromEntries(
  STUDIO_COLORS.map((color) => [color.id, color]),
);

export function colorHex(colorId: string | undefined, fallback = "#6a6f71"): string {
  return colorId ? (STUDIO_COLOR_INDEX[colorId]?.hex ?? fallback) : fallback;
}

const METAL = ["COL-MATTE-BLACK", "COL-BRONZE", "COL-STONE", "COL-WARM-WHITE"];
const TIMBER = ["COL-TEAK", "COL-WALNUT", "COL-MATTE-BLACK", "COL-STONE"];
const FABRIC = ["COL-SAND", "COL-OLIVE", "COL-TERRACOTTA", "COL-MATTE-BLACK"];

/**
 * Which sides of a rectangle an assembly builds along.
 *
 * Shared by the planting and screening assemblies. Seating deliberately does
 * not use this: it reads the guided wizard's own layout list instead, so the
 * two halves of the product cannot disagree about what a U-shape is.
 */
const SIDE_SET_OPTIONS = [
  { value: "perimeter", label: "All four sides" },
  { value: "three", label: "Three sides (U)" },
  { value: "opposite", label: "Two opposite sides" },
  { value: "corner", label: "Two sides (L)" },
  { value: "one", label: "One side" },
];

const ROOF_STYLE_OPTIONS = [
  { value: "pyramid", label: "Pyramid" },
  { value: "flat", label: "Flat" },
  { value: "gable", label: "Gable" },
  { value: "pergola", label: "Pergola" },
  { value: "louvered", label: "Louvered" },
];

export const STUDIO_ELEMENT_TYPES: StudioElementType[] = [
  // --------------------------------------------------------------- Assemblies
  //
  // These store parameters and derive their parts. They are deliberately
  // `solid: false`: collision is checked on the derived posts and beams, so a
  // bench placed *inside* a pavilion is not reported as a clash — which is the
  // whole point of putting it there.
  //
  // They carry no price either. `calculateStudioPrice` expands them and prices
  // the parts, so the bill of materials stays honest and derivable.
  {
    id: "ASM-PAVILION",
    sku: "STU-ASM-PAV",
    kind: "post",
    group: "Assemblies",
    name: "Pavilion",
    description:
      "Roof, posts and beams as one group. Change the span and the posts move with it; change the roof style and nothing else has to.",
    // What the default parameters derive: a 3 m span plus 300 mm of overhang
    // each side, and a 2.6 m eave under a 700 mm pyramid. The palette caption
    // and the drag ghost read this, so a wrong value here advertises a
    // pavilion that is not the one that lands on the canvas.
    // `tests/studioAssemblies.test.ts` holds the two in step.
    defaultSize: { widthMm: 3600, depthMm: 3600, heightMm: 3300 },
    resize: {},
    defaultElevationMm: 0,
    solid: false,
    colorIds: METAL,
    price: placeholder(0),
    priceMode: "perUnit",
    assetKey: "studio:assembly",
    assembly: {
      params: [
        { kind: "number", key: "spanW", label: "Span (width)", minMm: 1800, maxMm: 8000, stepMm: 100, unit: "mm" },
        { kind: "number", key: "spanD", label: "Span (depth)", minMm: 1800, maxMm: 8000, stepMm: 100, unit: "mm" },
        { kind: "number", key: "eaveHeight", label: "Eave height", minMm: 2000, maxMm: 3600, stepMm: 50, unit: "mm" },
        { kind: "choice", key: "roofStyle", label: "Roof style", options: ROOF_STYLE_OPTIONS },
        { kind: "number", key: "overhang", label: "Roof overhang", minMm: 0, maxMm: 800, stepMm: 50, unit: "mm" },
        { kind: "number", key: "baysW", label: "Bays across width", minMm: 1, maxMm: 4, stepMm: 1, unit: "count" },
        { kind: "number", key: "baysD", label: "Bays across depth", minMm: 1, maxMm: 4, stepMm: 1, unit: "count" },
        { kind: "number", key: "postSection", label: "Post section", minMm: 80, maxMm: 200, stepMm: 10, unit: "mm" },
      ],
      defaults: {
        spanW: 3000,
        spanD: 3000,
        eaveHeight: 2600,
        roofStyle: "pyramid",
        overhang: 300,
        baysW: 1,
        baysD: 1,
        postSection: 100,
      },
    },
  },
  {
    id: "ASM-SEATING",
    sku: "STU-ASM-SEAT",
    kind: "bench",
    group: "Assemblies",
    name: "Seating Layout",
    description:
      "A bench run around a rectangle — perimeter, U, L or a single side. Reuses the same layouts as the guided wizard.",
    defaultSize: { widthMm: 3000, depthMm: 3000, heightMm: 450 },
    resize: {},
    defaultElevationMm: 0,
    solid: false,
    colorIds: TIMBER,
    price: placeholder(0),
    priceMode: "perUnit",
    assetKey: "studio:assembly",
    assembly: {
      params: [
        {
          kind: "choice",
          key: "layoutId",
          label: "Layout",
          options: [
            { value: "SEAT-PERIMETER", label: "Around / Perimeter" },
            { value: "SEAT-U", label: "U-shape" },
            { value: "SEAT-L", label: "L-shape" },
            { value: "SEAT-INSIDE", label: "Inside (two sides)" },
            { value: "SEAT-ONE-SIDE", label: "One side" },
          ],
        },
        { kind: "number", key: "spanW", label: "Span (width)", minMm: 1200, maxMm: 8000, stepMm: 100, unit: "mm" },
        { kind: "number", key: "spanD", label: "Span (depth)", minMm: 1200, maxMm: 8000, stepMm: 100, unit: "mm" },
        { kind: "number", key: "seatDepth", label: "Seat depth", minMm: 400, maxMm: 900, stepMm: 50, unit: "mm" },
        { kind: "number", key: "seatHeight", label: "Seat height", minMm: 380, maxMm: 520, stepMm: 10, unit: "mm" },
        {
          kind: "choice",
          key: "style",
          label: "Seat style",
          options: [
            { value: "bench", label: "Slatted bench" },
            { value: "lounge", label: "Cushioned lounge" },
          ],
        },
      ],
      defaults: {
        layoutId: "SEAT-PERIMETER",
        spanW: 3000,
        spanD: 3000,
        seatDepth: 550,
        seatHeight: 450,
        style: "bench",
      },
    },
  },

  {
    id: "ASM-PLANTING",
    sku: "STU-ASM-PLT",
    kind: "planter",
    group: "Assemblies",
    name: "Planting Border",
    description:
      "Planter runs around a rectangle, with planting set into them. Change the sides or the bed and everything follows.",
    defaultSize: { widthMm: 3000, depthMm: 3000, heightMm: 1350 },
    resize: {},
    defaultElevationMm: 0,
    solid: false,
    colorIds: TIMBER,
    price: placeholder(0),
    priceMode: "perUnit",
    assetKey: "studio:assembly",
    assembly: {
      params: [
        { kind: "choice", key: "sides", label: "Sides", options: SIDE_SET_OPTIONS },
        { kind: "number", key: "spanW", label: "Span (width)", minMm: 1000, maxMm: 10000, stepMm: 100, unit: "mm" },
        { kind: "number", key: "spanD", label: "Span (depth)", minMm: 1000, maxMm: 10000, stepMm: 100, unit: "mm" },
        { kind: "number", key: "bedDepth", label: "Bed depth", minMm: 300, maxMm: 800, stepMm: 50, unit: "mm" },
        { kind: "number", key: "bedHeight", label: "Bed height", minMm: 250, maxMm: 900, stepMm: 50, unit: "mm" },
        {
          kind: "choice",
          key: "planting",
          label: "Planting",
          options: [
            { value: "full", label: "Full — every 700 mm" },
            { value: "low", label: "Sparse — every 1400 mm" },
            { value: "none", label: "Empty beds" },
          ],
        },
        {
          kind: "number",
          key: "plantHeight",
          label: "Planting height",
          minMm: 300,
          maxMm: 2000,
          stepMm: 50,
          unit: "mm",
          showWhen: { key: "planting", equals: "full" },
        },
      ],
      defaults: {
        sides: "perimeter",
        spanW: 3000,
        spanD: 3000,
        bedDepth: 400,
        bedHeight: 450,
        planting: "full",
        plantHeight: 900,
      },
    },
  },
  {
    id: "ASM-LIGHTING",
    sku: "STU-ASM-LGT",
    kind: "light",
    group: "Assemblies",
    name: "Lighting Run",
    description:
      "Fixtures laid out in a row, a grid or around a perimeter, evenly spaced across the span you choose.",
    defaultSize: { widthMm: 3000, depthMm: 300, heightMm: 2400 },
    resize: {},
    defaultElevationMm: 0,
    solid: false,
    colorIds: METAL,
    price: placeholder(0),
    priceMode: "perUnit",
    assetKey: "studio:assembly",
    assembly: {
      params: [
        {
          kind: "choice",
          key: "pattern",
          label: "Pattern",
          options: [
            { value: "row", label: "A single row" },
            { value: "grid", label: "A grid" },
            { value: "perimeter", label: "Around a perimeter" },
          ],
        },
        {
          kind: "choice",
          key: "fixture",
          label: "Fixture",
          options: [
            { value: "pendant", label: "Pendant light" },
            { value: "lantern", label: "Floor lantern" },
          ],
        },
        { kind: "number", key: "spanW", label: "Span (width)", minMm: 500, maxMm: 10000, stepMm: 100, unit: "mm" },
        {
          kind: "number",
          key: "spanD",
          label: "Span (depth)",
          minMm: 500,
          maxMm: 10000,
          stepMm: 100,
          unit: "mm",
          showWhen: { key: "pattern", equals: "grid" },
        },
        { kind: "number", key: "countW", label: "Fixtures across", minMm: 1, maxMm: 10, stepMm: 1, unit: "count" },
        {
          kind: "number",
          key: "countD",
          label: "Fixtures deep",
          minMm: 1,
          maxMm: 10,
          stepMm: 1,
          unit: "count",
          showWhen: { key: "pattern", equals: "grid" },
        },
        {
          kind: "number",
          key: "mountHeight",
          label: "Hanging height",
          minMm: 1400,
          maxMm: 3200,
          stepMm: 50,
          unit: "mm",
          showWhen: { key: "fixture", equals: "pendant" },
        },
        {
          kind: "number",
          key: "lanternHeight",
          label: "Lantern height",
          minMm: 400,
          maxMm: 1800,
          stepMm: 50,
          unit: "mm",
          showWhen: { key: "fixture", equals: "lantern" },
        },
      ],
      defaults: {
        pattern: "row",
        fixture: "pendant",
        spanW: 3000,
        spanD: 3000,
        countW: 3,
        countD: 3,
        mountHeight: 2100,
        lanternHeight: 900,
      },
    },
  },
  {
    id: "ASM-SCREEN",
    sku: "STU-ASM-SCR",
    kind: "screen",
    group: "Assemblies",
    name: "Screen Wall",
    description:
      "Screens, trellises or balustrades along the sides you choose. Adds wind area — always escalated for review.",
    defaultSize: { widthMm: 3000, depthMm: 3000, heightMm: 1900 },
    resize: {},
    defaultElevationMm: 0,
    solid: false,
    colorIds: TIMBER,
    price: placeholder(0),
    priceMode: "perUnit",
    assetKey: "studio:assembly",
    assembly: {
      params: [
        { kind: "choice", key: "sides", label: "Sides", options: SIDE_SET_OPTIONS },
        {
          kind: "choice",
          key: "style",
          label: "Style",
          options: [
            { value: "screen", label: "Slatted privacy screen" },
            { value: "trellis", label: "Climbing trellis" },
            { value: "balustrade", label: "Open balustrade" },
          ],
        },
        { kind: "number", key: "spanW", label: "Span (width)", minMm: 1000, maxMm: 10000, stepMm: 100, unit: "mm" },
        { kind: "number", key: "spanD", label: "Span (depth)", minMm: 1000, maxMm: 10000, stepMm: 100, unit: "mm" },
        { kind: "number", key: "height", label: "Height", minMm: 700, maxMm: 3000, stepMm: 50, unit: "mm" },
      ],
      defaults: {
        sides: "opposite",
        style: "screen",
        spanW: 3000,
        spanD: 3000,
        height: 1900,
      },
    },
  },

  // ---------------------------------------------------------------- Structure
  {
    id: "EL-POST",
    sku: "STU-PST-01",
    kind: "post",
    group: "Structure",
    name: "Post",
    description:
      "A vertical structural post. Place four to define a bay, or more for a longer run.",
    defaultSize: { widthMm: 100, depthMm: 100, heightMm: 2600 },
    resize: {
      width: { minMm: 80, maxMm: 200, stepMm: 10 },
      depth: { minMm: 80, maxMm: 200, stepMm: 10 },
      height: { minMm: 2000, maxMm: 3600, stepMm: 50 },
    },
    defaultElevationMm: 0,
    solid: true,
    colorIds: METAL,
    price: placeholder(680),
    priceMode: "perUnit",
    assetKey: "studio:post",
  },
  {
    id: "EL-BEAM",
    sku: "STU-BEM-01",
    kind: "post",
    group: "Structure",
    name: "Beam",
    description:
      "A horizontal beam spanning between posts. Sits at post height by default.",
    defaultSize: { widthMm: 3000, depthMm: 100, heightMm: 160 },
    resize: {
      width: { minMm: 800, maxMm: 6000, stepMm: 100 },
      depth: { minMm: 80, maxMm: 200, stepMm: 10 },
      height: { minMm: 100, maxMm: 300, stepMm: 10 },
    },
    defaultElevationMm: 2440,
    elevation: { minMm: 1800, maxMm: 3600, stepMm: 20 },
    solid: false,
    colorIds: METAL,
    price: placeholder(240),
    priceMode: "perLinearMetre",
    assetKey: "studio:beam",
  },
  {
    id: "EL-DECK",
    sku: "STU-DCK-01",
    kind: "deck",
    group: "Structure",
    name: "Deck Platform",
    description: "A raised timber platform. Everything else can sit on top of it.",
    defaultSize: { widthMm: 3000, depthMm: 3000, heightMm: 120 },
    resize: {
      width: { minMm: 1000, maxMm: 12000, stepMm: 100 },
      depth: { minMm: 1000, maxMm: 12000, stepMm: 100 },
      height: { minMm: 60, maxMm: 600, stepMm: 20 },
    },
    defaultElevationMm: 0,
    solid: false,
    colorIds: TIMBER,
    price: placeholder(420),
    priceMode: "perSquareMetre",
    assetKey: "studio:deck",
  },

  // Hidden roof surfaces. Only ever produced by an assembly, never offered on
  // their own, but real catalog records so the roof appears in the breakdown.
  ...([
    ["pyramid", "Pyramid Roof", 2400, 700],
    ["flat", "Flat Roof", 1900, 160],
    ["gable", "Gable Roof", 2500, 800],
    ["pergola", "Pergola Roof", 1600, 220],
    ["louvered", "Louvered Roof", 3800, 240],
  ] as const).map(([style, name, price, peak]) => ({
    id: `EL-ROOF-${style.toUpperCase()}`,
    sku: `STU-ROF-${style.slice(0, 3).toUpperCase()}`,
    kind: "deck" as StudioElementKind,
    group: "Structure" as StudioGroup,
    name,
    description: "Derived from a pavilion assembly.",
    defaultSize: { widthMm: 3600, depthMm: 3600, heightMm: peak },
    resize: {},
    defaultElevationMm: 2600,
    solid: false,
    colorIds: METAL,
    price: placeholder(price),
    priceMode: "perSquareMetre" as const,
    assetKey: `studio:roof-${style}`,
    hidden: true,
  })),

  // ------------------------------------------------------------------ Seating
  {
    id: "EL-BENCH",
    sku: "STU-BNC-01",
    kind: "bench",
    group: "Seating",
    name: "Bench",
    description: "A straight bench run. Lengthen it to seat more people.",
    defaultSize: { widthMm: 1800, depthMm: 550, heightMm: 450 },
    resize: {
      width: { minMm: 600, maxMm: 5000, stepMm: 100 },
      depth: { minMm: 400, maxMm: 900, stepMm: 50 },
      height: { minMm: 380, maxMm: 520, stepMm: 10 },
    },
    defaultElevationMm: 0,
    solid: true,
    colorIds: TIMBER,
    price: placeholder(980),
    priceMode: "perLinearMetre",
    assetKey: "studio:bench",
    seats: 3,
  },
  {
    id: "EL-LOUNGE",
    sku: "STU-LNG-01",
    kind: "bench",
    group: "Seating",
    name: "Lounge Seat",
    description: "A deeper cushioned seat with a backrest, for longer sittings.",
    defaultSize: { widthMm: 1800, depthMm: 800, heightMm: 720 },
    resize: {
      width: { minMm: 800, maxMm: 4000, stepMm: 100 },
      depth: { minMm: 700, maxMm: 1000, stepMm: 50 },
      height: { minMm: 650, maxMm: 850, stepMm: 10 },
    },
    defaultElevationMm: 0,
    solid: true,
    colorIds: FABRIC,
    price: placeholder(1650),
    priceMode: "perLinearMetre",
    assetKey: "studio:lounge",
    seats: 3,
  },
  {
    id: "EL-CHAIR",
    sku: "STU-CHR-01",
    kind: "chair",
    group: "Seating",
    name: "Chair",
    description: "A single seat that can be placed and angled on its own.",
    defaultSize: { widthMm: 600, depthMm: 620, heightMm: 800 },
    resize: {
      width: { minMm: 450, maxMm: 900, stepMm: 10 },
      depth: { minMm: 450, maxMm: 900, stepMm: 10 },
      height: { minMm: 700, maxMm: 1000, stepMm: 10 },
    },
    defaultElevationMm: 0,
    solid: true,
    colorIds: FABRIC,
    price: placeholder(890),
    priceMode: "perUnit",
    assetKey: "studio:chair",
    seats: 1,
  },

  // ----------------------------------------------------------------- Surfaces
  {
    id: "EL-TABLE",
    sku: "STU-TBL-01",
    kind: "table",
    group: "Surfaces",
    name: "Table",
    description: "A dining or coffee table. Lower the height for a coffee table.",
    defaultSize: { widthMm: 1400, depthMm: 800, heightMm: 740 },
    resize: {
      width: { minMm: 500, maxMm: 3000, stepMm: 50 },
      depth: { minMm: 500, maxMm: 1200, stepMm: 50 },
      height: { minMm: 350, maxMm: 800, stepMm: 10 },
    },
    defaultElevationMm: 0,
    solid: true,
    colorIds: TIMBER,
    price: placeholder(1750),
    priceMode: "perUnit",
    assetKey: "studio:table",
  },
  {
    id: "EL-SIDE-TABLE",
    sku: "STU-TBL-02",
    kind: "table",
    group: "Surfaces",
    name: "Side Table",
    description: "A small surface beside a seat.",
    defaultSize: { widthMm: 500, depthMm: 500, heightMm: 450 },
    resize: {
      width: { minMm: 350, maxMm: 800, stepMm: 10 },
      depth: { minMm: 350, maxMm: 800, stepMm: 10 },
      height: { minMm: 300, maxMm: 700, stepMm: 10 },
    },
    defaultElevationMm: 0,
    solid: true,
    colorIds: TIMBER,
    price: placeholder(620),
    priceMode: "perUnit",
    assetKey: "studio:table",
  },

  // ----------------------------------------------------------------- Greenery
  {
    id: "EL-PLANTER",
    sku: "STU-PLT-01",
    kind: "planter",
    group: "Greenery",
    name: "Planter Box",
    description: "A long planter. Stretch it to line an edge.",
    defaultSize: { widthMm: 1200, depthMm: 400, heightMm: 450 },
    resize: {
      width: { minMm: 400, maxMm: 4000, stepMm: 100 },
      depth: { minMm: 300, maxMm: 800, stepMm: 50 },
      height: { minMm: 250, maxMm: 900, stepMm: 50 },
    },
    defaultElevationMm: 0,
    solid: true,
    colorIds: TIMBER,
    price: placeholder(640),
    priceMode: "perLinearMetre",
    assetKey: "studio:planter",
  },
  {
    id: "EL-POT",
    sku: "STU-POT-01",
    kind: "planter",
    group: "Greenery",
    name: "Round Pot",
    description: "A standalone pot for a specimen plant.",
    defaultSize: { widthMm: 500, depthMm: 500, heightMm: 500 },
    resize: {
      width: { minMm: 300, maxMm: 1200, stepMm: 50 },
      height: { minMm: 300, maxMm: 1200, stepMm: 50 },
    },
    defaultElevationMm: 0,
    solid: true,
    colorIds: ["COL-STONE", "COL-TERRACOTTA", "COL-MATTE-BLACK", "COL-WARM-WHITE"],
    price: placeholder(380),
    priceMode: "perUnit",
    assetKey: "studio:pot",
  },
  {
    id: "EL-PLANT",
    sku: "STU-PLN-01",
    kind: "plant",
    group: "Greenery",
    name: "Planting",
    description:
      "Foliage. Place it in a planter or a pot — suitability depends on climate and light.",
    defaultSize: { widthMm: 700, depthMm: 700, heightMm: 900 },
    resize: {
      width: { minMm: 300, maxMm: 2000, stepMm: 50 },
      height: { minMm: 300, maxMm: 3000, stepMm: 50 },
    },
    defaultElevationMm: 0,
    elevation: { minMm: 0, maxMm: 1200, stepMm: 50 },
    solid: false,
    colorIds: ["COL-MOSS", "COL-OLIVE"],
    price: placeholder(190),
    priceMode: "perUnit",
    assetKey: "studio:plant",
  },
  {
    id: "EL-TRELLIS",
    sku: "STU-TRL-01",
    kind: "screen",
    group: "Greenery",
    name: "Trellis",
    description: "A climbing frame. Climbing plants need one of these to grow up.",
    defaultSize: { widthMm: 1200, depthMm: 60, heightMm: 2100 },
    resize: {
      width: { minMm: 600, maxMm: 3000, stepMm: 100 },
      height: { minMm: 1200, maxMm: 3000, stepMm: 100 },
    },
    defaultElevationMm: 0,
    solid: false,
    colorIds: TIMBER,
    price: placeholder(520),
    priceMode: "perLinearMetre",
    assetKey: "studio:trellis",
  },

  // -------------------------------------------------------------------- Water
  {
    id: "EL-AQUARIUM",
    sku: "STU-AQU-01",
    kind: "aquarium",
    group: "Water",
    name: "Aquarium",
    description:
      "A glass tank on a stand. Volume and filled mass are estimated from its size.",
    defaultSize: { widthMm: 1200, depthMm: 500, heightMm: 600 },
    resize: {
      width: { minMm: 400, maxMm: 2400, stepMm: 50 },
      depth: { minMm: 300, maxMm: 900, stepMm: 50 },
      height: { minMm: 300, maxMm: 1000, stepMm: 50 },
    },
    defaultElevationMm: 550,
    elevation: { minMm: 0, maxMm: 1200, stepMm: 50 },
    solid: true,
    colorIds: ["COL-MATTE-BLACK", "COL-STONE"],
    price: placeholder(4200),
    priceMode: "perUnit",
    assetKey: "studio:aquarium",
    meta: { water: true },
  },
  {
    id: "EL-WATER-FEATURE",
    sku: "STU-WTR-01",
    kind: "aquarium",
    group: "Water",
    name: "Water Feature",
    description: "A recirculating basin, separate from any aquarium.",
    defaultSize: { widthMm: 900, depthMm: 900, heightMm: 400 },
    resize: {
      width: { minMm: 400, maxMm: 2000, stepMm: 50 },
      depth: { minMm: 400, maxMm: 2000, stepMm: 50 },
      height: { minMm: 200, maxMm: 900, stepMm: 50 },
    },
    defaultElevationMm: 0,
    solid: true,
    colorIds: ["COL-STONE", "COL-MATTE-BLACK"],
    price: placeholder(2400),
    priceMode: "perUnit",
    assetKey: "studio:water",
    meta: { water: true },
  },

  // ---------------------------------------------------------------- Enclosure
  {
    id: "EL-SCREEN",
    sku: "STU-SCR-01",
    kind: "screen",
    group: "Enclosure",
    name: "Privacy Screen",
    description: "A slatted screen. Use it to close a side or block a view.",
    defaultSize: { widthMm: 1800, depthMm: 80, heightMm: 1900 },
    resize: {
      width: { minMm: 600, maxMm: 6000, stepMm: 100 },
      height: { minMm: 900, maxMm: 3000, stepMm: 100 },
    },
    defaultElevationMm: 0,
    solid: true,
    colorIds: TIMBER,
    price: placeholder(1120),
    priceMode: "perLinearMetre",
    assetKey: "studio:screen",
    meta: { windLoad: true },
  },
  {
    id: "EL-BALUSTRADE",
    sku: "STU-BAL-01",
    kind: "screen",
    group: "Enclosure",
    name: "Balustrade",
    description: "A low open rail that bounds an area without closing it.",
    defaultSize: { widthMm: 2000, depthMm: 60, heightMm: 1000 },
    resize: {
      width: { minMm: 600, maxMm: 6000, stepMm: 100 },
      height: { minMm: 700, maxMm: 1300, stepMm: 50 },
    },
    defaultElevationMm: 0,
    solid: false,
    colorIds: METAL,
    price: placeholder(760),
    priceMode: "perLinearMetre",
    assetKey: "studio:balustrade",
  },

  // ----------------------------------------------------------------- Lighting
  {
    id: "EL-PENDANT",
    sku: "STU-LGT-01",
    kind: "light",
    group: "Lighting",
    name: "Pendant Light",
    description: "A hanging light. Raise or lower it with the elevation control.",
    defaultSize: { widthMm: 300, depthMm: 300, heightMm: 300 },
    resize: { width: { minMm: 150, maxMm: 800, stepMm: 50 } },
    defaultElevationMm: 2100,
    elevation: { minMm: 1400, maxMm: 3200, stepMm: 50 },
    solid: false,
    colorIds: METAL,
    price: placeholder(540),
    priceMode: "perUnit",
    assetKey: "studio:pendant",
    meta: { electrical: true },
  },
  {
    id: "EL-FLOOR-LAMP",
    sku: "STU-LGT-02",
    kind: "light",
    group: "Lighting",
    name: "Floor Lantern",
    description: "A standing lantern that marks an edge or a path.",
    defaultSize: { widthMm: 260, depthMm: 260, heightMm: 900 },
    resize: { height: { minMm: 400, maxMm: 1800, stepMm: 50 } },
    defaultElevationMm: 0,
    solid: false,
    colorIds: METAL,
    price: placeholder(430),
    priceMode: "perUnit",
    assetKey: "studio:lantern",
    meta: { electrical: true },
  },
];

export const STUDIO_TYPE_INDEX: Record<string, StudioElementType> =
  Object.fromEntries(STUDIO_ELEMENT_TYPES.map((type) => [type.id, type]));

export function getElementType(typeId: string): StudioElementType | undefined {
  return STUDIO_TYPE_INDEX[typeId];
}

export const STUDIO_GROUPS: StudioGroup[] = [
  "Assemblies",
  "Structure",
  "Seating",
  "Surfaces",
  "Greenery",
  "Water",
  "Enclosure",
  "Lighting",
];

export function typesByGroup(group: StudioGroup): StudioElementType[] {
  return STUDIO_ELEMENT_TYPES.filter(
    (type) => type.group === group && !type.hidden,
  );
}

export function isAssemblyType(typeId: string): boolean {
  return Boolean(STUDIO_TYPE_INDEX[typeId]?.assembly);
}
