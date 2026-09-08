import type { CatalogItem } from "../types/catalog.ts";

/**
 * Seating layouts. `sides` drives which bench runs the 3D scene draws, and
 * `runFactor` is the share of the pavilion perimeter used for linear pricing.
 */
export const SEATING_LAYOUTS: CatalogItem[] = [
  {
    id: "SEAT-NONE",
    category: "seatingLayout",
    name: "No seating",
    status: "active",
    description:
      "An empty pavilion. Choose this if you already have furniture, or want a display or planting structure.",
    assetKey: "seat:none",
    meta: { sides: [], runFactor: 0 },
  },
  {
    id: "SEAT-INSIDE",
    sku: "SEAT-INS-01",
    category: "seatingLayout",
    name: "Inside",
    status: "active",
    description:
      "Benches set inside the frame line, leaving the outer edge clear for planters.",
    price: { amount: 980, currency: "SAR", status: "placeholder" },
    pricingMode: "perLinearMetre",
    assetKey: "seat:inside",
    meta: { sides: ["north", "south"], inset: true, runFactor: 0.5 },
  },
  {
    id: "SEAT-PERIMETER",
    sku: "SEAT-PER-01",
    category: "seatingLayout",
    name: "Around / Perimeter",
    status: "active",
    description:
      "A continuous bench on all four sides. The most seats for a given footprint.",
    price: { amount: 980, currency: "SAR", status: "placeholder" },
    pricingMode: "perLinearMetre",
    assetKey: "seat:perimeter",
    meta: {
      sides: ["north", "south", "east", "west"],
      inset: false,
      runFactor: 1,
    },
  },
  {
    id: "SEAT-ONE-SIDE",
    sku: "SEAT-ONE-01",
    category: "seatingLayout",
    name: "One side",
    status: "active",
    description: "A single bench run. Keeps the pavilion open and walk-through.",
    price: { amount: 980, currency: "SAR", status: "placeholder" },
    pricingMode: "perLinearMetre",
    assetKey: "seat:one-side",
    meta: { sides: ["north"], inset: false, runFactor: 0.25 },
  },
  {
    id: "SEAT-L",
    sku: "SEAT-L-01",
    category: "seatingLayout",
    name: "L-shape",
    status: "active",
    description: "Two adjoining runs. A conversational corner.",
    price: { amount: 980, currency: "SAR", status: "placeholder" },
    pricingMode: "perLinearMetre",
    assetKey: "seat:l-shape",
    meta: { sides: ["north", "east"], inset: false, runFactor: 0.5 },
  },
  {
    id: "SEAT-U",
    sku: "SEAT-U-01",
    category: "seatingLayout",
    name: "U-shape",
    status: "active",
    description: "Three runs around an open side. Good for a central feature.",
    price: { amount: 980, currency: "SAR", status: "placeholder" },
    pricingMode: "perLinearMetre",
    assetKey: "seat:u-shape",
    meta: { sides: ["north", "east", "west"], inset: false, runFactor: 0.75 },
  },
];

export const SEATING_STYLES: CatalogItem[] = [
  {
    id: "SEATSTYLE-BENCH",
    category: "seatingStyle",
    name: "Slatted Bench",
    status: "active",
    description: "Open slats, no cushion. The simplest and easiest to maintain.",
    assetKey: "seatstyle:bench",
    meta: { cushion: false, seatHeightMm: 450 },
  },
  {
    id: "SEATSTYLE-CUSHION",
    category: "seatingStyle",
    name: "Cushioned Bench",
    status: "active",
    description: "Bench base with a removable outdoor cushion.",
    price: { amount: 320, currency: "SAR", status: "placeholder" },
    pricingMode: "perLinearMetre",
    assetKey: "seatstyle:cushion",
    meta: { cushion: true, seatHeightMm: 430 },
  },
  {
    id: "SEATSTYLE-LOUNGE",
    category: "seatingStyle",
    name: "Deep Lounge",
    status: "active",
    description: "Deeper seat and a backrest cushion for longer sittings.",
    price: { amount: 620, currency: "SAR", status: "placeholder" },
    pricingMode: "perLinearMetre",
    requires: ["SEAT-PERIMETER"],
    assetKey: "seatstyle:lounge",
    meta: { cushion: true, backrest: true, seatHeightMm: 400, depthMm: 780 },
  },
  {
    id: "SEATSTYLE-STORAGE",
    category: "seatingStyle",
    name: "Storage Bench",
    status: "future",
    description: "Bench with a lift-up lid for cushion storage.",
    unavailableReason:
      "Hinge, drainage and weather sealing details are not designed yet.",
    assetKey: "seatstyle:storage",
  },
];

/** Cushion fabrics. Only meaningful when the chosen style has a cushion. */
export const FABRICS: CatalogItem[] = [
  {
    id: "FAB-SAND",
    category: "fabric",
    name: "Sand",
    status: "active",
    description: "Warm neutral, matches the cream brand palette.",
    assetKey: "fabric:sand",
    meta: { swatch: "#ddd2ba" },
  },
  {
    id: "FAB-OLIVE",
    category: "fabric",
    name: "Olive",
    status: "active",
    description: "Muted green that sits quietly against planting.",
    assetKey: "fabric:olive",
    meta: { swatch: "#7d8261" },
  },
  {
    id: "FAB-CHARCOAL",
    category: "fabric",
    name: "Charcoal",
    status: "active",
    description: "Dark and forgiving. Pairs with the matte black frame.",
    assetKey: "fabric:charcoal",
    meta: { swatch: "#3c4044" },
  },
  {
    id: "FAB-TERRACOTTA",
    category: "fabric",
    name: "Terracotta",
    status: "active",
    description: "A warmer accent for indoor and shaded settings.",
    price: { amount: 180, currency: "SAR", status: "placeholder" },
    pricingMode: "flat",
    assetKey: "fabric:terracotta",
    meta: { swatch: "#a9613f" },
  },
];
