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
  | "Structure"
  | "Seating"
  | "Surfaces"
  | "Greenery"
  | "Water"
  | "Enclosure"
  | "Lighting";

export type SizeRange = { minMm: number; maxMm: number; stepMm: number };

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

export const STUDIO_ELEMENT_TYPES: StudioElementType[] = [
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
  "Structure",
  "Seating",
  "Surfaces",
  "Greenery",
  "Water",
  "Enclosure",
  "Lighting",
];

export function typesByGroup(group: StudioGroup): StudioElementType[] {
  return STUDIO_ELEMENT_TYPES.filter((type) => type.group === group);
}
