import { getItem } from "@/data/catalog";
import type { CatalogItem, PriceStatus } from "@/types/catalog";
import type { DesignConfiguration } from "@/domain/configuration/schema";
import { derive, type DerivedConfiguration } from "@/domain/configuration/derive";
import { PLANTERS } from "@/data/catalog/plants";
import { meta } from "@/data/catalog";

/**
 * Pricing engine.
 *
 * `configuration + catalog → line items → estimated total`.
 *
 * No component computes money on its own. Adding a priced option means adding
 * a catalog record with a `price` and a `pricingMode`, not editing this file.
 */

export type PriceLine = {
  itemId: string;
  sku?: string;
  description: string;
  /** Grouping used by the breakdown UI. */
  group: PriceGroup;
  quantity: number;
  unit: string;
  unitPrice: number;
  subtotal: number;
  priceStatus: PriceStatus;
  /** Why this quantity is what it is, shown as a hint in the breakdown. */
  note?: string;
};

export type PriceGroup =
  | "Pavilion"
  | "Structure"
  | "Roof"
  | "Seating"
  | "Aquarium"
  | "Aquatic life"
  | "Planting"
  | "Add-ons"
  | "Services";

/**
 * Extension points for V2. Kept in the input so installation, delivery,
 * regional pricing, discounts and tax can be added without changing the
 * shape of the result.
 */
export type PricingContext = {
  /** Delivery & installation, priced as a share of the product subtotal. */
  includeInstallation?: boolean;
  /** Annual maintenance package. */
  includeMaintenance?: boolean;
  /** Reserved: region multiplier, discounts and tax are not modelled in V1. */
  regionId?: string;
  discountCode?: string;
};

export type PriceBreakdown = {
  lines: PriceLine[];
  /** Sum of product line items, before services. */
  productSubtotal: number;
  /** Sum of service line items (installation, maintenance). */
  servicesSubtotal: number;
  total: number;
  currency: "SAR";
  /** True while any contributing price is placeholder seed data. */
  isEstimate: boolean;
  /** Reserved for V2 — always zero in V1, kept so the UI never has to change. */
  tax: number;
  discount: number;
};

/** Delivery & installation as a share of the product subtotal. Placeholder. */
export const INSTALLATION_RATE = 0.12;
/** Annual maintenance package as a share of the product subtotal. Placeholder. */
export const MAINTENANCE_RATE = 0.06;

const GROUP_BY_CATEGORY: Record<string, PriceGroup> = {
  pavilion: "Pavilion",
  shape: "Pavilion",
  sizePreset: "Pavilion",
  material: "Structure",
  finish: "Structure",
  roof: "Roof",
  seatingLayout: "Seating",
  seatingStyle: "Seating",
  fabric: "Seating",
  aquariumPosition: "Aquarium",
  aquariumShape: "Aquarium",
  species: "Aquatic life",
  planter: "Planting",
  plant: "Planting",
  addon: "Add-ons",
};

/**
 * Quantity and unit for one catalog item, from its pricing mode.
 * `explicitQuantity` covers per-unit items such as planter modules.
 */
function resolveQuantity(
  item: CatalogItem,
  derived: DerivedConfiguration,
  explicitQuantity?: number,
): { quantity: number; unit: string; note?: string } {
  switch (item.pricingMode) {
    case "perSquareMetre":
      return {
        quantity: round2(derived.footprintM2),
        unit: "m²",
        note: "Scaled with the pavilion footprint.",
      };
    case "perLinearMetre":
      return {
        quantity: round2(derived.seatingRunM),
        unit: "m",
        note: "Scaled with the length of bench built.",
      };
    case "perUnit":
      return { quantity: explicitQuantity ?? 1, unit: "unit" };
    case "flat":
    default:
      return { quantity: 1, unit: "item" };
  }
}

function round2(value: number): number {
  return Math.round(value * 100) / 100;
}

function lineFor(
  item: CatalogItem | undefined,
  derived: DerivedConfiguration,
  options: { quantity?: number; group?: PriceGroup; note?: string } = {},
): PriceLine | null {
  if (!item?.price) return null;

  const { quantity, unit, note } = resolveQuantity(item, derived, options.quantity);
  if (quantity <= 0) return null;

  return {
    itemId: item.id,
    sku: item.sku,
    description: item.name,
    group: options.group ?? GROUP_BY_CATEGORY[item.category] ?? "Add-ons",
    quantity,
    unit,
    unitPrice: item.price.amount,
    subtotal: Math.round(item.price.amount * quantity),
    priceStatus: item.price.status,
    note: options.note ?? note,
  };
}

/**
 * Build the full price breakdown for a configuration.
 * Pure: same configuration + catalog always produces the same result.
 */
export function calculatePrice(
  config: DesignConfiguration,
  context: PricingContext = {},
): PriceBreakdown {
  const derived = derive(config);
  const lines: PriceLine[] = [];

  const push = (line: PriceLine | null) => {
    if (line) lines.push(line);
  };

  // Pavilion platform, shape and size preset.
  push(lineFor(getItem(config.pavilion.familyId), derived));
  push(lineFor(getItem(config.pavilion.shapeId), derived));
  push(lineFor(getItem(config.pavilion.sizePresetId), derived));

  // Structure.
  push(lineFor(getItem(config.structure.materialId), derived));
  push(lineFor(getItem(config.structure.finishId), derived));

  // Roof.
  push(lineFor(getItem(config.roof.roofId), derived));

  // Seating — only priced when seating is actually enabled.
  if (config.seating.enabled) {
    push(lineFor(getItem(config.seating.layoutId), derived));
    push(lineFor(getItem(config.seating.styleId), derived));
    push(lineFor(getItem(config.seating.fabricId), derived));
  }

  // Aquarium — position, tank shape and demo livestock.
  if (config.aquarium.enabled) {
    push(lineFor(getItem(config.aquarium.positionId), derived));
    push(lineFor(getItem(config.aquarium.shapeId), derived));
    for (const speciesId of config.aquarium.selectedSpeciesIds) {
      const species = getItem(speciesId);
      push(
        lineFor(species, derived, {
          quantity: 1,
          note: "Indicative livestock allowance for a demo group.",
        }),
      );
    }
  }

  // Planting. Planter modules scale with the number of units per pavilion.
  for (const planterId of config.plants.planterIds) {
    const planter = getItem(planterId);
    const units = meta<number>(planter, "unitsPerPavilion") ?? 1;
    push(lineFor(planter, derived, { quantity: units }));
  }
  for (const plantId of config.plants.plantIds) {
    push(lineFor(getItem(plantId), derived));
  }

  // Add-ons.
  for (const addonId of config.addons) {
    push(lineFor(getItem(addonId), derived));
  }

  const productSubtotal = lines.reduce((sum, line) => sum + line.subtotal, 0);

  // Services are derived from the product subtotal rather than the catalog.
  const serviceLines: PriceLine[] = [];
  if (context.includeInstallation) {
    serviceLines.push({
      itemId: "SVC-INSTALL",
      description: "Delivery & installation",
      group: "Services",
      quantity: 1,
      unit: "service",
      unitPrice: Math.round(productSubtotal * INSTALLATION_RATE),
      subtotal: Math.round(productSubtotal * INSTALLATION_RATE),
      priceStatus: "placeholder",
      note: `Placeholder rate: ${Math.round(INSTALLATION_RATE * 100)}% of the product subtotal.`,
    });
  }
  if (context.includeMaintenance) {
    serviceLines.push({
      itemId: "SVC-MAINTENANCE",
      description: "Annual maintenance package",
      group: "Services",
      quantity: 1,
      unit: "year",
      unitPrice: Math.round(productSubtotal * MAINTENANCE_RATE),
      subtotal: Math.round(productSubtotal * MAINTENANCE_RATE),
      priceStatus: "placeholder",
      note: `Placeholder rate: ${Math.round(MAINTENANCE_RATE * 100)}% of the product subtotal per year.`,
    });
  }

  const allLines = [...lines, ...serviceLines];
  const servicesSubtotal = serviceLines.reduce((sum, line) => sum + line.subtotal, 0);

  return {
    lines: allLines,
    productSubtotal,
    servicesSubtotal,
    total: productSubtotal + servicesSubtotal,
    currency: "SAR",
    isEstimate: allLines.some((line) => line.priceStatus === "placeholder"),
    tax: 0,
    discount: 0,
  };
}

/** Group the breakdown for display, preserving a stable group order. */
export function groupLines(breakdown: PriceBreakdown): {
  group: PriceGroup;
  lines: PriceLine[];
  subtotal: number;
}[] {
  const order: PriceGroup[] = [
    "Pavilion",
    "Structure",
    "Roof",
    "Seating",
    "Aquarium",
    "Aquatic life",
    "Planting",
    "Add-ons",
    "Services",
  ];

  return order
    .map((group) => {
      const groupLines = breakdown.lines.filter((line) => line.group === group);
      return {
        group,
        lines: groupLines,
        subtotal: groupLines.reduce((sum, line) => sum + line.subtotal, 0),
      };
    })
    .filter((entry) => entry.lines.length > 0);
}

/** Catalog ids of every planter module, used by the planting step. */
export const PLANTER_IDS = PLANTERS.map((planter) => planter.id);
