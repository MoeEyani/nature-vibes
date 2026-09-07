"use client";

import { useSearchParams } from "next/navigation";
import { Suspense, useEffect, useRef } from "react";
import { ENVIRONMENTS } from "@/data/catalog";
import {
  ENVIRONMENT_PARAM,
  resolveEnvironmentParam,
} from "@/domain/configuration/environmentParam";
import { useConfiguratorStore } from "@/store/useConfiguratorStore";
import { Callout } from "@/components/ui/Callout";
import { OptionCard } from "@/components/ui/OptionCard";
import { OptionGrid, Section } from "@/components/ui/Section";

/**
 * `useSearchParams` needs a Suspense boundary under static export, so the
 * preselect logic lives in its own component.
 */
export function LocationStep() {
  return (
    <Suspense fallback={<EnvironmentOptions />}>
      <EnvironmentPreselect />
      <EnvironmentOptions />
    </Suspense>
  );
}

/**
 * Applies `?environment=ENV-…`, which is how the home page's environment cards
 * carry the customer's choice into the wizard.
 *
 * Applied once per mount so it seeds the step without fighting the customer if
 * they then pick a different environment.
 */
function EnvironmentPreselect() {
  const searchParams = useSearchParams();
  const hydrated = useConfiguratorStore((state) => state.hydrated);
  const setEnvironment = useConfiguratorStore((state) => state.setEnvironment);
  const applied = useRef(false);

  const requested = searchParams.get(ENVIRONMENT_PARAM);

  useEffect(() => {
    // Wait for hydration, or the restored session would overwrite the choice.
    if (!hydrated || applied.current || !requested) return;

    const environmentId = resolveEnvironmentParam(requested);
    if (environmentId) setEnvironment(environmentId);
    applied.current = true;
  }, [hydrated, requested, setEnvironment]);

  return null;
}

function EnvironmentOptions() {
  const environment = useConfiguratorStore((state) => state.config.environment);
  const setEnvironment = useConfiguratorStore((state) => state.setEnvironment);

  return (
    <>
      <Section title="Environment">
        <OptionGrid columns={3}>
          {ENVIRONMENTS.map((item) => (
            <OptionCard
              key={item.id}
              item={item}
              selected={environment === item.id}
              onSelect={setEnvironment}
              media={<EnvironmentThumb id={item.id} />}
            />
          ))}
        </OptionGrid>
      </Section>

      {environment === "ENV-ROOFTOP" ? (
        <Callout tone="review" title="Rooftop installations always need review" className="mt-6">
          Rooftop projects require verified structural capacity, waterproofing,
          anchoring and wind loading before anything can be manufactured or
          installed. The configurator will flag this on the validation step; it
          cannot approve it.
        </Callout>
      ) : null}
    </>
  );
}

/** A small procedural scene thumbnail — no image assets needed in V1. */
function EnvironmentThumb({ id }: { id: string }) {
  const palettes: Record<string, [string, string, string]> = {
    "ENV-INDOOR": ["#efe7d8", "#d8cbb4", "#8d7a5f"],
    "ENV-GARDEN": ["#cfe0d2", "#9dbf9e", "#4c6b4f"],
    "ENV-ROOFTOP": ["#6b7590", "#98a1b5", "#37405a"],
    "ENV-COMMERCIAL": ["#ded8cd", "#b8b0a1", "#6d6659"],
  };
  const [sky, mid, dark] = palettes[id] ?? palettes["ENV-GARDEN"];

  return (
    <div
      className="h-24 w-full overflow-hidden rounded-lg"
      style={{ background: `linear-gradient(170deg, ${sky}, ${mid})` }}
      aria-hidden
    >
      <svg viewBox="0 0 200 96" className="h-full w-full">
        <path d="M60 62V38l40-22 40 22v24Z" fill={dark} opacity="0.85" />
        <path d="M100 12 148 40H52Z" fill={dark} />
        <rect x="62" y="60" width="76" height="5" rx="2" fill={dark} opacity="0.7" />
        <circle cx="42" cy="70" r="12" fill={dark} opacity="0.35" />
        <circle cx="164" cy="72" r="9" fill={dark} opacity="0.3" />
        <rect x="0" y="80" width="200" height="16" fill={dark} opacity="0.18" />
      </svg>
    </div>
  );
}
