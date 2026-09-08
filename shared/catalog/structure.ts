import type { CatalogItem } from "../types/catalog.ts";

/**
 * Frame materials.
 *
 * Descriptions are marketing-level characteristics only. No structural
 * capacity, span or load claim is made here — those are Needs Measurement.
 */
export const MATERIALS: CatalogItem[] = [
  {
    id: "MAT-ALU",
    sku: "MAT-ALU-01",
    category: "material",
    name: "Aluminium",
    status: "active",
    description:
      "Lightweight and corrosion-resistant. The default for rooftop and coastal projects.",
    price: { amount: 340, currency: "SAR", status: "placeholder" },
    pricingMode: "perSquareMetre",
    tags: ["lightweight", "corrosion-resistant"],
    assetKey: "material:aluminium",
    meta: { baseColor: "#6f7671", metalness: 0.75, roughness: 0.35 },
  },
  {
    id: "MAT-STEEL",
    sku: "MAT-STL-01",
    category: "material",
    name: "Steel",
    status: "active",
    description:
      "Heavier section with a solid feel. Needs a protective coating outdoors.",
    price: { amount: 290, currency: "SAR", status: "placeholder" },
    pricingMode: "perSquareMetre",
    tags: ["heavy", "coated"],
    assetKey: "material:steel",
    meta: { baseColor: "#4c5257", metalness: 0.85, roughness: 0.4, heavy: true },
  },
  {
    id: "MAT-TIMBER",
    sku: "MAT-TMB-01",
    category: "material",
    name: "Timber",
    status: "active",
    description:
      "Natural warmth. Requires periodic maintenance in exposed positions.",
    price: { amount: 430, currency: "SAR", status: "placeholder" },
    pricingMode: "perSquareMetre",
    tags: ["natural", "maintenance"],
    assetKey: "material:timber",
    meta: { baseColor: "#8b5e3c", metalness: 0.05, roughness: 0.75 },
  },
  {
    id: "MAT-HYBRID",
    sku: "MAT-HYB-01",
    category: "material",
    name: "Hybrid",
    status: "active",
    description:
      "Metal frame with timber cladding. Combines the structural frame with a natural surface.",
    price: { amount: 520, currency: "SAR", status: "placeholder" },
    pricingMode: "perSquareMetre",
    tags: ["metal", "timber"],
    assetKey: "material:hybrid",
    meta: { baseColor: "#5a5f5b", metalness: 0.6, roughness: 0.5 },
  },
];

/** Frame finishes. Swatch hexes are UI colours, not specified paint codes. */
export const FINISHES: CatalogItem[] = [
  {
    id: "FIN-MATTE-BLACK",
    category: "finish",
    name: "Matte Black",
    status: "active",
    description: "The reference finish across the concept imagery.",
    assetKey: "finish:matte-black",
    meta: { swatch: "#22262a", roughness: 0.7, metalness: 0.35 },
  },
  {
    id: "FIN-WHITE",
    category: "finish",
    name: "Warm White",
    status: "active",
    description: "Bright and light. Best indoors and in shaded gardens.",
    price: { amount: 450, currency: "SAR", status: "placeholder" },
    pricingMode: "flat",
    assetKey: "finish:white",
    meta: { swatch: "#eee8dc", roughness: 0.6, metalness: 0.1 },
  },
  {
    id: "FIN-BRONZE",
    category: "finish",
    name: "Bronze",
    status: "active",
    description: "Warm metallic tone that ages gracefully.",
    price: { amount: 780, currency: "SAR", status: "placeholder" },
    pricingMode: "flat",
    assetKey: "finish:bronze",
    meta: { swatch: "#7a5230", roughness: 0.45, metalness: 0.8 },
  },
  {
    id: "FIN-GREY",
    category: "finish",
    name: "Stone Grey",
    status: "active",
    description: "Neutral mid-grey that disappears into most façades.",
    price: { amount: 450, currency: "SAR", status: "placeholder" },
    pricingMode: "flat",
    assetKey: "finish:grey",
    meta: { swatch: "#6a6f71", roughness: 0.65, metalness: 0.3 },
  },
  {
    id: "FIN-WOOD",
    category: "finish",
    name: "Wood Effect",
    status: "active",
    description: "Timber-look coating over a metal frame.",
    price: { amount: 1150, currency: "SAR", status: "placeholder" },
    pricingMode: "flat",
    incompatibleWith: ["MAT-TIMBER"],
    assetKey: "finish:wood",
    meta: { swatch: "#96643a", roughness: 0.7, metalness: 0.05 },
  },
  {
    id: "FIN-CUSTOM",
    category: "finish",
    name: "Custom RAL",
    status: "future",
    description: "Any RAL colour, matched to your project.",
    unavailableReason:
      "Custom colour matching needs a supplier and minimum-order agreement that is not in place yet.",
    assetKey: "finish:custom",
    meta: { swatch: "linear-gradient" },
  },
];
