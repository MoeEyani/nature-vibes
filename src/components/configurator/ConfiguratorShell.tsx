"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo } from "react";
import { STEP_BY_ID, visibleSteps, type StepId } from "@/constants/steps";
import {
  useConfiguratorStore,
  usePriceBreakdown,
  useValidation,
} from "@/store/useConfiguratorStore";
import { Button, ButtonLink } from "@/components/ui/Button";
import { Viewport } from "@/components/three/Viewport";
import { Stepper } from "./Stepper";
import { PriceSummary } from "./PricePanel";
import { SeverityBadge } from "./ValidationList";

import { LocationStep } from "./steps/LocationStep";
import { SpaceStep } from "./steps/SpaceStep";
import { PavilionStep } from "./steps/PavilionStep";
import { StructureStep } from "./steps/StructureStep";
import { RoofStep } from "./steps/RoofStep";
import { SeatingStep } from "./steps/SeatingStep";
import { AquariumStep } from "./steps/AquariumStep";
import { AquaticLifeStep } from "./steps/AquaticLifeStep";
import { PlantsStep } from "./steps/PlantsStep";
import { AddonsStep } from "./steps/AddonsStep";
import { ReviewStep } from "./steps/ReviewStep";
import { ValidationStep } from "./steps/ValidationStep";
import { QuoteStep } from "./steps/QuoteStep";
import { SuccessStep } from "./steps/SuccessStep";

const STEP_COMPONENTS: Record<StepId, () => React.ReactElement> = {
  location: LocationStep,
  space: SpaceStep,
  pavilion: PavilionStep,
  structure: StructureStep,
  roof: RoofStep,
  seating: SeatingStep,
  aquarium: AquariumStep,
  "aquatic-life": AquaticLifeStep,
  plants: PlantsStep,
  addons: AddonsStep,
  review: ReviewStep,
  validation: ValidationStep,
  quote: QuoteStep,
  success: SuccessStep,
};

/** Steps that render their own full-width layout instead of the split view. */
const FULL_WIDTH: StepId[] = ["review", "validation", "quote", "success"];

export function ConfiguratorShell({ stepId }: { stepId: StepId }) {
  const router = useRouter();
  const hydrate = useConfiguratorStore((state) => state.hydrate);
  const hydrated = useConfiguratorStore((state) => state.hydrated);
  const markVisited = useConfiguratorStore((state) => state.markVisited);
  const config = useConfiguratorStore((state) => state.config);
  const visited = useConfiguratorStore((state) => state.visited);

  const breakdown = usePriceBreakdown();
  const validation = useValidation();

  // Restore the saved draft once, on the client.
  useEffect(() => {
    hydrate();
  }, [hydrate]);

  useEffect(() => {
    markVisited(stepId);
  }, [markVisited, stepId]);

  const steps = useMemo(() => visibleSteps(config), [config]);
  const definition = STEP_BY_ID[stepId];

  const index = steps.findIndex((step) => step.id === stepId);
  const previous = index > 0 ? steps[index - 1] : null;
  const next = index >= 0 && index < steps.length - 1 ? steps[index + 1] : null;

  // The aquatic-life step disappears when the aquarium is turned off; if the
  // customer is standing on it, move them on rather than showing a dead page.
  // Only after hydration — before that the store still holds the default
  // configuration, which would bounce a legitimate deep link.
  useEffect(() => {
    if (hydrated && index === -1 && stepId !== "success") {
      router.replace("/design/aquarium");
    }
  }, [hydrated, index, router, stepId]);

  const StepComponent = STEP_COMPONENTS[stepId];
  const isFullWidth = FULL_WIDTH.includes(stepId);
  const isTerminal = Boolean(definition.terminal);

  return (
    <div className="flex min-h-[calc(100vh-4rem)] flex-col">
      {/* Progress rail */}
      <div className="border-b border-line bg-off-white/95 backdrop-blur">
        <div className="mx-auto flex max-w-[1600px] flex-wrap items-center gap-4 px-4 py-3 sm:px-6">
          <Link
            href="/"
            className="hidden shrink-0 items-center gap-1.5 text-sm text-ink-muted transition-colors hover:text-brand-green sm:inline-flex"
          >
            <span aria-hidden>←</span> Home
          </Link>
          <div className="min-w-0 flex-1">
            <Stepper steps={steps} currentId={stepId} visited={visited} />
          </div>
          <div className="hidden shrink-0 items-center gap-3 lg:flex">
            <SeverityBadge severity={validation.status} />
            <ButtonLink href="/design/quote" variant="secondary" size="sm">
              Save for later
            </ButtonLink>
          </div>
        </div>
      </div>

      {/* Step body */}
      <div className="mx-auto w-full max-w-[1600px] flex-1 px-4 py-8 sm:px-6">
        <header className="mb-6 max-w-3xl">
          <p className="eyebrow text-brand-green">{definition.eyebrow}</p>
          <h1 className="font-display mt-2 text-3xl font-semibold text-ink sm:text-4xl">
            {definition.title}
          </h1>
          <p className="mt-2 leading-relaxed text-ink-muted">{definition.subtitle}</p>
        </header>

        {!hydrated ? (
          <p className="sr-only" role="status">
            Restoring your saved design…
          </p>
        ) : null}

        {isFullWidth ? (
          <StepComponent />
        ) : (
          <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(22rem,34%)] lg:items-start">
            <div className="min-w-0">
              <StepComponent />
            </div>

            <aside className="space-y-4 lg:sticky lg:top-4">
              <Viewport config={config} className="h-[22rem]" />
              <PriceSummary breakdown={breakdown} />
            </aside>
          </div>
        )}
      </div>

      {/* Navigation */}
      {!isTerminal ? (
        <div className="sticky bottom-0 border-t border-line bg-off-white/95 backdrop-blur">
          <div className="mx-auto flex max-w-[1600px] items-center justify-between gap-4 px-4 py-3 sm:px-6">
            {previous ? (
              <ButtonLink href={`/design/${previous.id}`} variant="secondary">
                <span aria-hidden>←</span> Back
              </ButtonLink>
            ) : (
              <ButtonLink href="/" variant="secondary">
                <span aria-hidden>←</span> Home
              </ButtonLink>
            )}

            <div className="flex items-center gap-3">
              {stepId === "quote" ? null : next ? (
                <ButtonLink href={`/design/${next.id}`} size="lg">
                  {/* The full step title is long on a phone; the short label
                      keeps the primary action on one line. */}
                  <span className="hidden sm:inline">Next: {next.title}</span>
                  <span className="sm:hidden">Next: {next.label}</span>
                  <span aria-hidden>→</span>
                </ButtonLink>
              ) : (
                <Button size="lg" disabled>
                  Complete the quote form above
                </Button>
              )}
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
