"use client";

import { DISCLAIMERS } from "@/constants/brand";
import { useConfiguratorStore, usePriceBreakdown, useValidation } from "@/store/useConfiguratorStore";
import { Callout } from "@/components/ui/Callout";
import { Section } from "@/components/ui/Section";
import { Viewport } from "@/components/three/Viewport";
import { ConfigurationSummary, SkuList } from "../ConfigurationSummary";
import { PriceBreakdownTable } from "../PricePanel";
import { ServicesPicker } from "../ServicesPicker";
import { SeverityBadge } from "../ValidationList";

export function ReviewStep() {
  const config = useConfiguratorStore((state) => state.config);
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
        <div className="mb-4">
          <h4 className="mb-2 text-sm font-medium text-ink">Services</h4>
          <ServicesPicker productSubtotal={breakdown.productSubtotal} />
          <p className="mt-2 text-xs text-ink-subtle">
            These are the same services the quote form submits — changing them
            here changes both the estimate and your request.
          </p>
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
