import type { PriceBreakdown, PriceLine } from "../pricing/calculatePrice.ts";
import { getElementType } from "./catalog.ts";
import { areaM2, runM } from "./geometry.ts";
import type { StudioDesign, StudioElement } from "./schema.ts";

/**
 * Studio pricing.
 *
 * `design + palette → line items → estimated total`, the same shape the
 * configurator's pricing engine produces, so the existing breakdown table
 * renders a studio design without changes.
 *
 * A studio design is a different product shape from a preset pavilion, so it
 * has its own quantity rules — but it reuses `PriceLine`/`PriceBreakdown` and
 * the same placeholder-price discipline.
 */

function round2(value: number): number {
  return Math.round(value * 100) / 100;
}

/** Quantity and unit for one element, from its type's pricing mode. */
export function quantityFor(element: StudioElement): { quantity: number; unit: string } {
  const type = getElementType(element.typeId);
  switch (type?.priceMode) {
    case "perSquareMetre":
      return { quantity: round2(areaM2(element)), unit: "m²" };
    case "perLinearMetre":
      return { quantity: round2(runM(element)), unit: "m" };
    case "perUnit":
    default:
      return { quantity: 1, unit: "unit" };
  }
}

export function priceElement(element: StudioElement): PriceLine | null {
  const type = getElementType(element.typeId);
  if (!type) return null;

  const { quantity, unit } = quantityFor(element);
  if (quantity <= 0) return null;

  return {
    itemId: element.id,
    sku: type.sku,
    description: element.label?.trim() || type.name,
    group: "Pavilion",
    quantity,
    unit,
    unitPrice: type.price.amount,
    subtotal: Math.round(type.price.amount * quantity),
    priceStatus: type.price.status,
    note:
      type.priceMode === "perSquareMetre"
        ? "Scaled with the element's footprint."
        : type.priceMode === "perLinearMetre"
          ? "Scaled with the element's length."
          : undefined,
  };
}

export function calculateStudioPrice(design: StudioDesign): PriceBreakdown {
  const lines = design.elements
    .map(priceElement)
    .filter((line): line is PriceLine => line !== null);

  const productSubtotal = lines.reduce((total, line) => total + line.subtotal, 0);

  return {
    lines,
    productSubtotal,
    servicesSubtotal: 0,
    total: productSubtotal,
    currency: "SAR",
    isEstimate: lines.some((line) => line.priceStatus === "placeholder"),
    tax: 0,
    discount: 0,
  };
}

/** Grouped for display: one row per element type, with a count. */
export type StudioPriceGroup = {
  typeId: string;
  name: string;
  count: number;
  subtotal: number;
};

export function groupStudioLines(design: StudioDesign): StudioPriceGroup[] {
  const groups = new Map<string, StudioPriceGroup>();

  for (const element of design.elements) {
    const type = getElementType(element.typeId);
    if (!type) continue;
    const line = priceElement(element);
    if (!line) continue;

    const existing = groups.get(element.typeId);
    if (existing) {
      existing.count += 1;
      existing.subtotal += line.subtotal;
    } else {
      groups.set(element.typeId, {
        typeId: element.typeId,
        name: type.name,
        count: 1,
        subtotal: line.subtotal,
      });
    }
  }

  return [...groups.values()].sort((a, b) => b.subtotal - a.subtotal);
}

/** Indicative seat count. Estimated, never a certified occupancy. */
export function estimateSeats(design: StudioDesign): number {
  return design.elements.reduce((total, element) => {
    const type = getElementType(element.typeId);
    if (!type?.seats) return total;

    // Bench-like elements seat in proportion to their length.
    if (type.priceMode === "perLinearMetre") {
      return total + Math.max(1, Math.floor(runM(element) / 0.6));
    }
    return total + type.seats;
  }, 0);
}
