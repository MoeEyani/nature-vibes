"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useState } from "react";
import { IS_DEMO } from "@/constants/appConfig";
import { BRAND } from "@/constants/brand";
import type { QuoteRecord } from "@/domain/configuration/schema";
import { getQuoteRepository } from "@/domain/quotes";
import { useConfiguratorStore } from "@/store/useConfiguratorStore";
import { formatCurrency, formatDate } from "@/lib/format";
import { Button, ButtonLink } from "@/components/ui/Button";
import { Callout } from "@/components/ui/Callout";
import { Viewport } from "@/components/three/Viewport";
import { ConfigurationSummary } from "../ConfigurationSummary";
import { ServicesSummary } from "../ServicesPicker";
import { SeverityBadge } from "../ValidationList";

/**
 * Confirmation screen.
 *
 * Reload-safe: the reference lives in the URL (`/design/success?ref=NV-…`) and
 * the record is re-read from the repository on load, so refreshing — or
 * opening the link later — does not erase a valid confirmation.
 *
 * `useSearchParams` needs a Suspense boundary under static export, hence the
 * split below.
 */
export function SuccessStep() {
  return (
    <Suspense fallback={<LoadingState />}>
      <SuccessContent />
    </Suspense>
  );
}

type LoadState =
  | { phase: "loading" }
  | { phase: "found"; record: QuoteRecord }
  | { phase: "missing" };

function SuccessContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const config = useConfiguratorStore((state) => state.config);
  const quote = useConfiguratorStore((state) => state.lastQuote);
  const storeReference = useConfiguratorStore((state) => state.reference);
  const adoptReference = useConfiguratorStore((state) => state.adoptReference);
  const startNewDesign = useConfiguratorStore((state) => state.startNewDesign);

  const reference = searchParams.get("ref") ?? quote?.reference ?? storeReference;
  const [state, setState] = useState<LoadState>(
    quote ? { phase: "found", record: recordFromQuote(quote) } : { phase: "loading" },
  );

  useEffect(() => {
    if (!reference) {
      setState({ phase: "missing" });
      return;
    }

    // The request submitted in this session is already authoritative.
    if (quote?.reference === reference) {
      setState({ phase: "found", record: recordFromQuote(quote) });
      return;
    }

    let cancelled = false;
    setState({ phase: "loading" });

    getQuoteRepository()
      .getByReference(reference)
      .then((record) => {
        if (cancelled) return;
        if (record) {
          adoptReference(record.reference);
          setState({ phase: "found", record });
        } else {
          setState({ phase: "missing" });
        }
      })
      .catch(() => {
        if (!cancelled) setState({ phase: "missing" });
      });

    return () => {
      cancelled = true;
    };
  }, [adoptReference, quote, reference]);

  if (state.phase === "loading") return <LoadingState />;

  if (state.phase === "missing") {
    return (
      <Callout tone="info" title="We could not find that request">
        {reference ? (
          <>
            No request is stored for reference{" "}
            <span className="font-mono font-medium">{reference}</span>.{" "}
            {IS_DEMO
              ? "Demo requests live in the browser that created them, so a link opened elsewhere will not find one."
              : "Please check the reference, or contact us and quote it."}
          </>
        ) : (
          <>Complete the quote form to receive a design reference.</>
        )}{" "}
        <Link
          href="/design/quote"
          className="font-medium text-brand-green underline underline-offset-2"
        >
          Back to the quote step
        </Link>
      </Callout>
    );
  }

  const { record } = state;

  return (
    <div className="space-y-6">
      <div className="overflow-hidden rounded-card border border-brand-green/20 bg-deep-green text-cream">
        <div className="grid gap-6 p-6 sm:p-8 lg:grid-cols-[1.1fr_1fr] lg:items-center">
          <div>
            <p className="eyebrow text-cream/60">
              {IS_DEMO ? "Demo mode" : "Thank you"}
            </p>
            <h2 className="font-display mt-2 text-3xl font-semibold sm:text-4xl">
              {IS_DEMO ? "Demo request saved." : "Your request is in."}
            </h2>
            <p className="mt-3 max-w-prose text-cream/80">
              {IS_DEMO ? (
                <>
                  This request was saved{" "}
                  <span className="font-medium text-cream">
                    in this browser only
                  </span>{" "}
                  and was{" "}
                  <span className="font-medium text-cream">
                    not sent to {BRAND.projectName}
                  </span>
                  . Nobody has been notified and nobody will contact you.
                </>
              ) : (
                <>
                  We have received your design. Our team will review it and come
                  back to you within {BRAND.quoteResponseDays}.
                </>
              )}
            </p>

            <div className="mt-6 inline-flex flex-col gap-1 rounded-card border border-cream/20 bg-black/15 px-5 py-4">
              <span className="eyebrow text-cream/60">Design reference</span>
              <span className="font-mono text-2xl font-semibold tracking-wider">
                {record.reference}
              </span>
              <span className="mt-1 text-xs text-cream/60">
                Bookmark this page — the reference is in the address bar.
              </span>
            </div>
          </div>

          <dl className="grid gap-3 text-sm sm:grid-cols-2 lg:grid-cols-1">
            <Detail label="Submitted" value={formatDate(record.submittedAt)} />
            <Detail
              label="Estimated total"
              value={`${formatCurrency(record.estimatedTotal)}${
                record.isEstimate ? " (placeholder)" : ""
              }`}
            />
            <div className="flex items-center justify-between gap-3 rounded-lg bg-black/15 px-4 py-2.5">
              <dt className="text-cream/60">Services</dt>
              <dd className="text-right font-medium">
                <ServicesSummary serviceIds={record.additionalServices} />
              </dd>
            </div>
            <div className="flex items-center justify-between gap-3 rounded-lg bg-black/15 px-4 py-2.5">
              <dt className="text-cream/60">Validation</dt>
              <dd>
                <SeverityBadge severity={record.validationStatus} />
              </dd>
            </div>
          </dl>
        </div>
      </div>

      {record.validationStatus === "review_required" ? (
        <Callout tone="review" title="Engineering review is part of the next step">
          This design includes items that need qualified verification before
          manufacturing or installation.{" "}
          {IS_DEMO
            ? "In a live deployment our team would raise these with you directly."
            : "Our team will raise these with you directly."}{" "}
          Nothing in this configurator constitutes an approval.
        </Callout>
      ) : null}

      <div className="grid gap-6 lg:grid-cols-[1.1fr_1fr]">
        <Viewport config={record.configuration ?? config} className="h-80" showLayers={false} />
        <div>
          <h3 className="font-display mb-3 text-lg font-semibold text-ink">
            What you designed
          </h3>
          <ConfigurationSummary
            config={record.configuration ?? config}
            linkSteps={false}
          />
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

function LoadingState() {
  return (
    <div className="flex items-center gap-3 rounded-card border border-line bg-white p-6">
      <span
        aria-hidden
        className="size-5 animate-spin rounded-full border-2 border-line border-t-brand-green"
      />
      <p className="text-sm text-ink-muted" role="status">
        Looking up your request…
      </p>
    </div>
  );
}

function recordFromQuote(
  quote: NonNullable<ReturnType<typeof useConfiguratorStore.getState>["lastQuote"]>,
): QuoteRecord {
  return {
    reference: quote.reference,
    submittedAt: quote.submittedAt,
    status: quote.status,
    estimatedTotal: quote.pricing.estimatedTotal,
    currency: quote.pricing.currency,
    isEstimate: quote.pricing.isEstimate,
    validationStatus: quote.validation.status,
    additionalServices: quote.additionalServices,
    configuration: quote.configuration,
  };
}

function Detail({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-3 rounded-lg bg-black/15 px-4 py-2.5">
      <dt className="text-cream/60">{label}</dt>
      <dd className="font-medium">{value}</dd>
    </div>
  );
}
