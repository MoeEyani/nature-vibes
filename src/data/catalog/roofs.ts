import type { CatalogItem } from "@/types/catalog";

/**
 * Roof styles. `heightMm` values describe the 3D placeholder geometry only.
 */
export const ROOFS: CatalogItem[] = [
  {
    id: "ROOF-PYRAMID",
    sku: "ROOF-PYR-01",
    category: "roof",
    name: "Pyramid",
    status: "active",
    description:
      "Four sloped panels meeting at a central peak. The M3 default and the shape used in the concept imagery.",
    price: { amount: 2400, currency: "SAR", status: "placeholder" },
    pricingMode: "perSquareMetre",
    compatibleWith: ["SHAPE-SQUARE", "SHAPE-RECT"],
    tags: ["solid", "rain-shedding"],
    assetKey: "roof:pyramid",
    meta: { peakHeightMm: 700, coverage: "full", shadesFully: true },
  },
  {
    id: "ROOF-FLAT",
    sku: "ROOF-FLT-01",
    category: "roof",
    name: "Flat",
    status: "active",
    description:
      "A clean horizontal cover with a concealed fall. Lowest overall height.",
    price: { amount: 1900, currency: "SAR", status: "placeholder" },
    pricingMode: "perSquareMetre",
    compatibleWith: ["SHAPE-SQUARE", "SHAPE-RECT"],
    tags: ["solid", "minimal"],
    assetKey: "roof:flat",
    meta: { peakHeightMm: 160, coverage: "full", shadesFully: true },
  },
  {
    id: "ROOF-PERGOLA",
    sku: "ROOF-PRG-01",
    category: "roof",
    name: "Pergola",
    status: "active",
    description:
      "Open timber-style battens. Partial shade and the natural host for climbing plants.",
    price: { amount: 1600, currency: "SAR", status: "placeholder" },
    pricingMode: "perSquareMetre",
    compatibleWith: ["SHAPE-SQUARE", "SHAPE-RECT"],
    tags: ["open", "climbing-friendly"],
    assetKey: "roof:pergola",
    meta: {
      peakHeightMm: 220,
      coverage: "partial",
      shadesFully: false,
      rainProtection: false,
    },
  },
  {
    id: "ROOF-LOUVERS",
    sku: "ROOF-LVR-01",
    category: "roof",
    name: "Louvers",
    status: "active",
    description:
      "Adjustable blades that open for air and close for shade. Manual in V1.",
    price: { amount: 3800, currency: "SAR", status: "placeholder" },
    pricingMode: "perSquareMetre",
    compatibleWith: ["SHAPE-SQUARE", "SHAPE-RECT"],
    tags: ["adjustable"],
    assetKey: "roof:louvers",
    meta: {
      peakHeightMm: 240,
      coverage: "adjustable",
      shadesFully: true,
      rainProtection: false,
    },
  },
  {
    id: "ROOF-CANOPY",
    category: "roof",
    name: "Tensile Canopy",
    status: "future",
    description: "A fabric canopy tensioned between the posts.",
    unavailableReason:
      "Fabric tensioning hardware and wind loading are not specified yet.",
    assetKey: "roof:canopy",
  },
  {
    id: "ROOF-GREEN",
    category: "roof",
    name: "Green Roof",
    status: "future",
    description: "A planted roof deck with integrated irrigation.",
    unavailableReason:
      "Saturated soil mass and waterproofing must be engineered before this can be offered.",
    assetKey: "roof:green",
  },
];
