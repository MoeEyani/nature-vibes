import type { CatalogItem } from "@/types/catalog";

/**
 * Where the pavilion will live. Drives several validation rules
 * (notably rooftop + aquarium → engineering review).
 */
export const ENVIRONMENTS: CatalogItem[] = [
  {
    id: "ENV-INDOOR",
    category: "environment",
    name: "Indoor",
    status: "active",
    description:
      "Apartments, interiors and balconies. Compact configurations that bring the garden inside.",
    tags: ["apartments", "interiors", "balconies"],
    assetKey: "env:indoor",
    meta: { tone: "warm", weatherExposure: "none" },
  },
  {
    id: "ENV-GARDEN",
    category: "environment",
    name: "Garden",
    status: "active",
    description:
      "Villas, backyards and landscapes. The most flexible environment for the full modular system.",
    tags: ["villas", "backyards", "landscapes"],
    assetKey: "env:garden",
    meta: { tone: "daylight", weatherExposure: "full" },
  },
  {
    id: "ENV-ROOFTOP",
    category: "environment",
    name: "Rooftop",
    status: "active",
    description:
      "Terraces, rooftops and urban spaces. Load, wind and anchoring always need verification.",
    tags: ["terraces", "rooftops", "urban"],
    assetKey: "env:rooftop",
    meta: { tone: "dusk", weatherExposure: "exposed", loadSensitive: true },
  },
  {
    id: "ENV-COMMERCIAL",
    category: "environment",
    name: "Commercial",
    status: "future",
    description:
      "Cafés, hotels and public spaces. Planned for a later release once the product family is repeatable.",
    unavailableReason:
      "Commercial projects need site-specific engineering and permitting that the MVP does not model yet.",
    tags: ["cafes", "hotels", "public"],
    assetKey: "env:commercial",
  },
];
