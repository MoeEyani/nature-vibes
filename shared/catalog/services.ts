/**
 * Service catalog.
 *
 * Services are the one thing the customer selects that is not part of the
 * physical product: delivery, maintenance, consultation, a site visit.
 *
 * Round 2 makes this list the single source of truth. Before, the review step
 * toggled `pricingContext.includeInstallation/includeMaintenance` while the
 * quote form kept its own `additionalServices` array, so the estimated total
 * and the submitted request could disagree. Both screens now read and write
 * `selectedServiceIds`, and pricing derives its service lines from the same
 * list, so a service can never be priced without being requested or requested
 * without being priced.
 */

/** How a service's price is derived. */
export type ServicePricing =
  | {
      mode: "rateOfProductSubtotal";
      /** Share of the product subtotal. Placeholder seed value. */
      rate: number;
      status: "placeholder" | "confirmed";
      unit: string;
    }
  | { mode: "onRequest" };

export type ServiceItem = {
  id: string;
  name: string;
  description: string;
  pricing: ServicePricing;
  /** Priced services appear in the estimate; on-request ones are a note. */
  note?: string;
};

export const SERVICES: ServiceItem[] = [
  {
    id: "SVC-DELIVERY",
    name: "Delivery & installation",
    description:
      "Transport to site, assembly and hand-over by the Nature Vibes team.",
    pricing: {
      mode: "rateOfProductSubtotal",
      rate: 0.12,
      status: "placeholder",
      unit: "service",
    },
  },
  {
    id: "SVC-MAINTENANCE",
    name: "Annual maintenance plan",
    description:
      "Scheduled servicing of the structure, planting, lighting and any water system.",
    pricing: {
      mode: "rateOfProductSubtotal",
      rate: 0.06,
      status: "placeholder",
      unit: "year",
    },
  },
  {
    id: "SVC-CONSULT",
    name: "Customization consultation",
    description:
      "A design session covering anything outside the standard options.",
    pricing: { mode: "onRequest" },
    note: "Quoted separately after the consultation.",
  },
  {
    id: "SVC-SITE-VISIT",
    name: "Site visit & measurement",
    description:
      "An on-site survey to confirm dimensions, access, power, water and drainage.",
    pricing: { mode: "onRequest" },
    note: "Quoted separately once the location is known.",
  },
];

export const SERVICE_INDEX: Record<string, ServiceItem> = Object.fromEntries(
  SERVICES.map((service) => [service.id, service]),
);

export function getService(id: string): ServiceItem | undefined {
  return SERVICE_INDEX[id];
}

/** Ignores unknown ids and de-duplicates, so stored data can never corrupt pricing. */
export function normalizeServiceIds(ids: readonly string[]): string[] {
  return [...new Set(ids)].filter((id) => Boolean(SERVICE_INDEX[id]));
}

/** The services a new design starts with. */
export const DEFAULT_SERVICE_IDS: string[] = ["SVC-DELIVERY"];
