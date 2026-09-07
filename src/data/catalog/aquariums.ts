import type { CatalogItem } from "@/types/catalog";

/**
 * Aquarium options.
 *
 * Nothing in this file is engineering data. Volumes are derived
 * geometrically in domain/aquarium.ts and are always labelled Estimated.
 */
export const AQUARIUM_POSITIONS: CatalogItem[] = [
  {
    id: "AQ-CENTER",
    sku: "AQ-CTR-01",
    category: "aquariumPosition",
    name: "Center",
    status: "active",
    description:
      "A raised tank in the middle of the pavilion, visible from every seat.",
    price: { amount: 3200, currency: "SAR", status: "placeholder" },
    pricingMode: "flat",
    incompatibleWith: ["SEAT-INSIDE"],
    assetKey: "aquarium:center",
    meta: { footprint: "center", maxLengthMm: 1800 },
  },
  {
    id: "AQ-SIDE",
    sku: "AQ-SID-01",
    category: "aquariumPosition",
    name: "Side",
    status: "active",
    description:
      "A tank against one edge of the pavilion, backing onto a bench or planter.",
    price: { amount: 2800, currency: "SAR", status: "placeholder" },
    pricingMode: "flat",
    assetKey: "aquarium:side",
    meta: { footprint: "side", maxLengthMm: 2000 },
  },
  {
    id: "AQ-INTEGRATED",
    sku: "AQ-INT-01",
    category: "aquariumPosition",
    name: "Integrated",
    status: "active",
    description:
      "Built into the bench and planter line so the tank reads as part of the structure.",
    price: { amount: 4600, currency: "SAR", status: "placeholder" },
    pricingMode: "flat",
    requires: ["SEATING"],
    assetKey: "aquarium:integrated",
    meta: { footprint: "integrated", maxLengthMm: 1600 },
  },
  {
    id: "AQ-PERIMETER",
    category: "aquariumPosition",
    name: "Perimeter",
    status: "future",
    description: "A continuous water channel around the pavilion edge.",
    unavailableReason:
      "A perimeter water channel needs sealing, circulation and load design that is not specified yet.",
    assetKey: "aquarium:perimeter",
  },
];

export const AQUARIUM_SHAPES: CatalogItem[] = [
  {
    id: "AQSHAPE-RECT",
    category: "aquariumShape",
    name: "Rectangular",
    status: "active",
    description: "Standard rectangular tank. The simplest to build and service.",
    assetKey: "aquariumshape:rect",
    meta: { volumeFactor: 1 },
  },
  {
    id: "AQSHAPE-CUBE",
    category: "aquariumShape",
    name: "Cube",
    status: "active",
    description: "Equal-sided tank with a deeper viewing profile.",
    price: { amount: 700, currency: "SAR", status: "placeholder" },
    pricingMode: "flat",
    assetKey: "aquariumshape:cube",
    meta: { volumeFactor: 1 },
  },
  {
    id: "AQSHAPE-CYL",
    category: "aquariumShape",
    name: "Cylindrical",
    status: "active",
    description:
      "A round column tank. Viewable from all sides but harder to plant and clean.",
    price: { amount: 1900, currency: "SAR", status: "placeholder" },
    pricingMode: "flat",
    compatibleWith: ["AQ-CENTER"],
    assetKey: "aquariumshape:cylinder",
    // A cylinder inscribed in the bounding box holds ~π/4 of it.
    meta: { volumeFactor: Math.PI / 4 },
  },
  {
    id: "AQSHAPE-BOW",
    category: "aquariumShape",
    name: "Bow Front",
    status: "future",
    description: "Curved front panel for a wider viewing angle.",
    unavailableReason:
      "Curved glass needs a verified supplier and thickness calculation.",
    assetKey: "aquariumshape:bow",
  },
];

/**
 * Demo species catalog.
 *
 * These entries exist to prove the compatibility-engine architecture. The
 * traits are illustrative and must not be presented as verified aquatic
 * livestock guidance.
 */
export const SPECIES: CatalogItem[] = [
  {
    id: "FISH-GUPPY",
    category: "species",
    name: "Guppy",
    status: "active",
    description: "Small, active and colourful. Demo data.",
    price: { amount: 25, currency: "SAR", status: "placeholder" },
    pricingMode: "flat",
    tags: ["community", "small"],
    assetKey: "species:guppy",
    meta: {
      verified: false,
      minVolumeL: 40,
      tempMinC: 22,
      tempMaxC: 28,
      temperament: "peaceful",
      color: "#e08a4a",
      schoolSize: 6,
    },
  },
  {
    id: "FISH-NEON-TETRA",
    category: "species",
    name: "Neon Tetra",
    status: "active",
    description: "A shoaling species that reads well in a planted tank. Demo data.",
    price: { amount: 22, currency: "SAR", status: "placeholder" },
    pricingMode: "flat",
    tags: ["community", "schooling"],
    assetKey: "species:neon-tetra",
    meta: {
      verified: false,
      minVolumeL: 60,
      tempMinC: 22,
      tempMaxC: 26,
      temperament: "peaceful",
      color: "#4aa8e0",
      schoolSize: 8,
    },
  },
  {
    id: "FISH-GOLDFISH",
    category: "species",
    name: "Goldfish",
    status: "active",
    description:
      "Large and heavily stocked in the reference imagery. Needs a big, cool tank. Demo data.",
    price: { amount: 40, currency: "SAR", status: "placeholder" },
    pricingMode: "flat",
    tags: ["coldwater", "large"],
    assetKey: "species:goldfish",
    meta: {
      verified: false,
      minVolumeL: 150,
      tempMinC: 18,
      tempMaxC: 23,
      temperament: "peaceful",
      color: "#e2762b",
      schoolSize: 3,
    },
  },
  {
    id: "FISH-BETTA",
    category: "species",
    name: "Betta",
    status: "active",
    description:
      "A striking single specimen. Territorial towards similar fish. Demo data.",
    price: { amount: 60, currency: "SAR", status: "placeholder" },
    pricingMode: "flat",
    tags: ["solitary"],
    assetKey: "species:betta",
    meta: {
      verified: false,
      minVolumeL: 30,
      tempMinC: 24,
      tempMaxC: 29,
      temperament: "territorial",
      color: "#9a4ae0",
      schoolSize: 1,
      // Demo rule input only — not verified biological guidance.
      incompatibleTemperaments: ["territorial"],
      finNipperRisk: true,
    },
  },
  {
    id: "FISH-CORYDORAS",
    category: "species",
    name: "Corydoras",
    status: "active",
    description: "Bottom-dwelling and calm. Keeps the substrate turned over. Demo data.",
    price: { amount: 35, currency: "SAR", status: "placeholder" },
    pricingMode: "flat",
    tags: ["bottom", "schooling"],
    assetKey: "species:corydoras",
    meta: {
      verified: false,
      minVolumeL: 80,
      tempMinC: 22,
      tempMaxC: 26,
      temperament: "peaceful",
      color: "#b9a68f",
      schoolSize: 6,
    },
  },
  {
    id: "FISH-KOI",
    category: "species",
    name: "Koi",
    status: "future",
    description: "Pond-scale fish. Not suitable for a pavilion tank.",
    unavailableReason:
      "Koi need pond-scale volume and filtration well beyond any V1 pavilion tank.",
    assetKey: "species:koi",
    meta: { verified: false, minVolumeL: 3000 },
  },
];
