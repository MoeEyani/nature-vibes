"use client";

import { DISCLAIMERS } from "@/constants/brand";
import { useConfiguratorStore, usePriceBreakdown, useValidation } from "@/store/useConfiguratorStore";
import { Callout } from "@/components/ui/Callout";
import { Section } from "@/components/ui/Section";
import { Toggle } from "@/components/ui/Field";
import { Viewport } from "@/components/three/Viewport";
import { ConfigurationSummary, SkuList } from "../ConfigurationSummary";
import { PriceBreakdownTable } from "../PricePanel";
import { SeverityBadge } from "../ValidationList";

export function ReviewStep() {
  const config = useConfiguratorStore((state) => state.config);
  const pricingContext = useConfiguratorStore((state) => state.pricingContext);
  const setPricingContext = useConfiguratorStore((state) => state.setPricingContext);
  const breakdown = usePriceBreakdown();
  const validation = useValidation();

  return (
    <div className="space-y-8">
      <div className="grid gap-6 lg:grid-cols-[1.1fr_1fr]">
        <Viewport config={config} className="h-[26rem]" />

        <div className="space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h3 className="font-display text-xl font-semibold text-ink">
              Your configuration
            </h3>
            <SeverityBadge severity={validation.status} />
          </div>
          <ConfigurationSummary config={config} />
        </div>
      </div>

      <Section
        title="Estimated price breakdown"
        description="Every line traces back to a catalog item, its price status and how its quantity was derived."
      >
        <div className="mb-3 grid gap-3 sm:grid-cols-2">
          <Toggle
            checked={Boolean(pricingContext.includeInstallation)}
            onChange={(includeInstallation) => setPricingContext({ includeInstallation })}
            label="Include delivery & installation"
            description="Placeholder rate applied to the product subtotal."
          />
          <Toggle
            checked={Boolean(pricingContext.includeMaintenance)}
            onChange={(includeMaintenance) => setPricingContext({ includeMaintenance })}
            label="Include annual maintenance"
            description="Placeholder rate, charged per year."
          />
        </div>

        <PriceBreakdownTable breakdown={breakdown} />

        <Callout tone="warning" title="Estimated price" className="mt-4">
          {DISCLAIMERS.price} Region, delivery distance, site conditions,
          discounts and tax are not modelled in this MVP.
        </Callout>
      </Section>

      <Section
        title="Configuration references"
        description="The stable ids behind this design — the starting point for a future bill of materials."
      >
        <SkuList config={config} />
      </Section>
    </div>
  );
}
