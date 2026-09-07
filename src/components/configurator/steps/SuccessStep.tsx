"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { BRAND } from "@/constants/brand";
import { useConfiguratorStore } from "@/store/useConfiguratorStore";
import { formatCurrency, formatDate } from "@/lib/format";
import { Button, ButtonLink } from "@/components/ui/Button";
import { Callout } from "@/components/ui/Callout";
import { Viewport } from "@/components/three/Viewport";
import { ConfigurationSummary } from "../ConfigurationSummary";
import { SeverityBadge } from "../ValidationList";

export function SuccessStep() {
  const router = useRouter();
  const config = useConfiguratorStore((state) => state.config);
  const quote = useConfiguratorStore((state) => state.lastQuote);
  const reference = useConfiguratorStore((state) => state.reference);
  const startNewDesign = useConfiguratorStore((state) => state.startNewDesign);

  if (!quote && !reference) {
    return (
      <Callout tone="info" title="No request submitted yet">
        Complete the quote form to receive a design reference.{" "}
        <Link
          href="/design/quote"
          className="font-medium text-brand-green underline underline-offset-2"
        >
          Go to the quote step
        </Link>
        .
      </Callout>
    );
  }

  const designReference = quote?.reference ?? reference!;

  return (
    <div className="space-y-6">
      <div className="overflow-hidden rounded-card border border-brand-green/20 bg-deep-green text-cream">
        <div className="grid gap-6 p-6 sm:p-8 lg:grid-cols-[1.1fr_1fr] lg:items-center">
          <div>
            <p className="eyebrow text-cream/60">Thank you</p>
            <h2 className="font-display mt-2 text-3xl font-semibold sm:text-4xl">
              {quote ? "Your request is in." : "Your design is saved."}
            </h2>
            <p className="mt-3 max-w-prose text-cream/80">
              {quote
                ? `Our team will review your configuration and come back to you within ${BRAND.quoteResponseDays}.`
                : "Keep this reference — it identifies your configuration."}
            </p>

            <div className="mt-6 inline-flex flex-col gap-1 rounded-card border border-cream/20 bg-black/15 px-5 py-4">
              <span className="eyebrow text-cream/60">Design reference</span>
              <span className="font-mono text-2xl font-semibold tracking-wider">
                {designReference}
              </span>
            </div>
          </div>

          <dl className="grid gap-3 text-sm sm:grid-cols-2 lg:grid-cols-1">
            {quote ? (
              <>
                <Detail label="Submitted" value={formatDate(quote.submittedAt)} />
                <Detail label="Contact" value={quote.customer.email} />
                <Detail
                  label="Estimated total"
                  value={`${formatCurrency(quote.pricing.estimatedTotal)}${
                    quote.pricing.isEstimate ? " (placeholder)" : ""
                  }`}
                />
                <div className="flex items-center justify-between gap-3 rounded-lg bg-black/15 px-4 py-2.5">
                  <dt className="text-cream/60">Validation</dt>
                  <dd>
                    <SeverityBadge severity={quote.validation.status} />
                  </dd>
                </div>
              </>
            ) : null}
          </dl>
        </div>
      </div>

      {quote?.validation.status === "review_required" ? (
        <Callout tone="review" title="Engineering review is part of your next step">
          Your design includes items that need qualified verification before
          manufacturing or installation. Our team will raise these with you
          directly — nothing in this configurator constitutes an approval.
        </Callout>
      ) : null}

      <div className="grid gap-6 lg:grid-cols-[1.1fr_1fr]">
        <Viewport config={config} className="h-80" showLayers={false} />
        <div>
          <h3 className="font-display mb-3 text-lg font-semibold text-ink">
            What you designed
          </h3>
          <ConfigurationSummary config={config} linkSteps={false} />
        </div>
      </div>

      <div className="flex flex-wrap gap-3">
        <ButtonLink href="/my-designs" variant="secondary" size="lg">
          View my designs
        </ButtonLink>
        <Button
          size="lg"
          onClick={() => {
            startNewDesign();
            router.push("/design/location");
          }}
        >
          Start a new design
        </Button>
      </div>
    </div>
  );
}

function Detail({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-3 rounded-lg bg-black/15 px-4 py-2.5">
      <dt className="text-cream/60">{label}</dt>
      <dd className="font-medium">{value}</dd>
    </div>
  );
}
