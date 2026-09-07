import type { CatalogItem } from "@/types/catalog";

/**
 * V1 ships a single "mother platform" rather than a wide product family.
 *
 * NOTE: the nominal 3.0 m × 3.0 m footprint is a *concept seed value* taken
 * from the brief. It is not an approved manufacturing specification.
 */
export const PAVILION_FAMILIES: CatalogItem[] = [
  {
    id: "PAV-M3",
    sku: "PAV-M3-SQ",
    category: "pavilion",
    name: "Nature Vibes Pavilion M3",
    status: "active",
    description:
      "The demo platform: four-post modular frame, pyramid roof by default, modular seating, planter modules and an optional integrated aquarium.",
    price: { amount: 9800, currency: "SAR", status: "placeholder" },
    pricingMode: "flat",
    assetKey: "frame",
    meta: {
      nominalWidthMm: 3000,
      nominalLengthMm: 3000,
      nominalHeightMm: 2600,
      postCount: 4,
      note: "Concept seed dimensions — Needs Measurement before manufacturing.",
    },
  },
  {
    id: "PAV-M4",
    category: "pavilion",
    name: "Nature Vibes Pavilion M4",
    status: "future",
    description:
      "A larger family planned once the M3 platform is validated in production.",
    unavailableReason:
      "Only one platform is modelled in the MVP so the V1 flow can be validated end to end.",
    assetKey: "frame",
  },
];

export const SHAPES: CatalogItem[] = [
  {
    id: "SHAPE-SQUARE",
    category: "shape",
    name: "Square",
    status: "active",
    description: "Equal sides. The default M3 geometry and the simplest to build.",
    assetKey: "shape:square",
  },
  {
    id: "SHAPE-RECT",
    category: "shape",
    name: "Rectangle",
    status: "active",
    description: "Longer on one axis. Suits narrow gardens and terraces.",
    price: { amount: 1400, currency: "SAR", status: "placeholder" },
    pricingMode: "flat",
    assetKey: "shape:rectangle",
  },
  {
    id: "SHAPE-HEX",
    category: "shape",
    name: "Hexagon",
    status: "future",
    description: "Six-sided pavilion with a radial roof.",
    unavailableReason:
      "Hexagonal geometry needs its own frame and roof engineering. Planned after V1.",
    assetKey: "shape:hexagon",
  },
  {
    id: "SHAPE-CUSTOM",
    category: "shape",
    name: "Custom",
    status: "future",
    description: "Free geometry designed around a specific site.",
    unavailableReason:
      "Custom geometry is a bespoke engineering project and always requires review. Not modelled in V1.",
    assetKey: "shape:custom",
  },
];

/**
 * Size presets keep V1 manufacturable: the customer picks from repeatable
 * footprints instead of typing arbitrary dimensions.
 */
export const SIZE_PRESETS: CatalogItem[] = [
  {
    id: "SIZE-3X3",
    sku: "PAV-M3-3030",
    category: "sizePreset",
    name: "3.0 × 3.0 m",
    status: "active",
    description: "The M3 concept size. Comfortable for 4–6 people.",
    compatibleWith: ["SHAPE-SQUARE"],
    assetKey: "size:3x3",
    meta: { widthMm: 3000, lengthMm: 3000, heightMm: 2600, seats: 6 },
  },
  {
    id: "SIZE-2X2",
    sku: "PAV-M3-2020",
    category: "sizePreset",
    name: "2.4 × 2.4 m",
    status: "active",
    description: "Compact square for balconies and small courtyards.",
    price: { amount: -1200, currency: "SAR", status: "placeholder" },
    pricingMode: "flat",
    compatibleWith: ["SHAPE-SQUARE"],
    assetKey: "size:2x2",
    meta: { widthMm: 2400, lengthMm: 2400, heightMm: 2450, seats: 4 },
  },
  {
    id: "SIZE-3X4",
    sku: "PAV-M3-3040",
    category: "sizePreset",
    name: "3.0 × 4.2 m",
    status: "active",
    description: "Rectangular footprint with room for a longer bench run.",
    price: { amount: 2600, currency: "SAR", status: "placeholder" },
    pricingMode: "flat",
    compatibleWith: ["SHAPE-RECT"],
    assetKey: "size:3x4",
    meta: { widthMm: 3000, lengthMm: 4200, heightMm: 2600, seats: 8 },
  },
  {
    id: "SIZE-3X5",
    sku: "PAV-M3-3050",
    category: "sizePreset",
    name: "3.0 × 5.4 m",
    status: "active",
    description: "The largest V1 footprint. Suits garden and terrace lounges.",
    price: { amount: 4900, currency: "SAR", status: "placeholder" },
    pricingMode: "flat",
    compatibleWith: ["SHAPE-RECT"],
    assetKey: "size:3x5",
    meta: { widthMm: 3000, lengthMm: 5400, heightMm: 2600, seats: 10 },
  },
  {
    id: "SIZE-CUSTOM",
    category: "sizePreset",
    name: "Custom size",
    status: "future",
    description: "Dimensions built to a measured site survey.",
    unavailableReason:
      "Free-size geometry requires a site survey and per-order engineering. Planned after V1.",
    assetKey: "size:custom",
  },
];
