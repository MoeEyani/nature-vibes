"use client";

import { SERVICES } from "@/data/catalog/services";
import { useConfiguratorStore } from "@/store/useConfiguratorStore";
import { formatCurrency } from "@/lib/format";
import { Badge } from "@/components/ui/Badge";
import { cn } from "@/components/ui/cn";

/**
 * Service selection.
 *
 * Deliberately one component used by both the review step and the quote form:
 * they cannot drift because there is only one control and one piece of state
 * behind it. Toggling here changes the estimate and the submitted request at
 * the same time.
 */
export function ServicesPicker({
  productSubtotal,
  className,
}: {
  /** Used to show what a rate-based service works out to. */
  productSubtotal: number;
  className?: string;
}) {
  const selected = useConfiguratorStore((state) => state.selectedServiceIds);
  const toggleService = useConfiguratorStore((state) => state.toggleService);

  return (
    <ul className={cn("grid gap-2 sm:grid-cols-2", className)}>
      {SERVICES.map((service) => {
        const isSelected = selected.includes(service.id);
        const pricing = service.pricing;
        const priced = pricing.mode === "rateOfProductSubtotal";
        const amount = priced ? Math.round(productSubtotal * pricing.rate) : 0;
        const perYear = priced && pricing.unit === "year";

        return (
          <li key={service.id}>
            <label
              className={cn(
                "flex h-full cursor-pointer gap-3 rounded-card border p-4 transition-colors",
                isSelected
                  ? "border-brand-green bg-brand-green/5"
                  : "border-line bg-white hover:border-brand-green/50",
              )}
            >
              <input
                type="checkbox"
                checked={isSelected}
                onChange={() => toggleService(service.id)}
                className="mt-0.5 size-4 shrink-0 accent-[var(--color-brand-green)]"
              />
              <span className="min-w-0">
                <span className="block font-medium text-ink">{service.name}</span>
                <span className="mt-0.5 block text-sm leading-relaxed text-ink-muted">
                  {service.description}
                </span>
                <span className="mt-2 flex flex-wrap items-center gap-2">
                  {priced ? (
                    <Badge tone="brand">
                      +{formatCurrency(amount)}
                      {perYear ? " / year" : null}
                    </Badge>
                  ) : (
                    <Badge tone="neutral">Quoted separately</Badge>
                  )}
                  {priced ? <Badge tone="warning">Placeholder</Badge> : null}
                </span>
                {service.note ? (
                  <span className="mt-1.5 block text-xs text-ink-subtle">
                    {service.note}
                  </span>
                ) : null}
              </span>
            </label>
          </li>
        );
      })}
    </ul>
  );
}

/** Read-only summary of the current selection, for confirmation screens. */
export function ServicesSummary({ serviceIds }: { serviceIds: readonly string[] }) {
  const chosen = SERVICES.filter((service) => serviceIds.includes(service.id));
  if (chosen.length === 0) {
    return <span className="text-ink-muted">No additional services</span>;
  }
  return <span>{chosen.map((service) => service.name).join(", ")}</span>;
}
