"use client";

import { useConfiguratorStore } from "@/store/useConfiguratorStore";
import { derive, METRES_PER_SEAT } from "@shared/configuration/derive";
import { SIZE_PRESETS } from "@shared/catalog/pavilions";
import { meta } from "@shared/catalog";
import { Callout } from "@/components/ui/Callout";
import { DimensionField, Field, TextInput } from "@/components/ui/Field";
import { Section } from "@/components/ui/Section";
import { formatFootprint } from "@/lib/format";

/**
 * Space & size.
 *
 * The customer's available space is advisory input: it feeds the fit rules and
 * the recommendation below, but the pavilion's own dimensions always come
 * from a size preset so V1 stays manufacturable.
 */
export function SpaceStep() {
  const config = useConfiguratorStore((state) => state.config);
  const setSpace = useConfiguratorStore((state) => state.setSpace);
  const setSizePreset = useConfiguratorStore((state) => state.setSizePreset);
  const derived = derive(config);

  const recommendation = recommendPreset(config.space);

  return (
    <>
      <Section
        title="Available space"
        description="Optional, but it lets us check that the pavilion actually fits and flag tight access."
      >
        <div className="grid gap-3 sm:grid-cols-3">
          <DimensionField
            label="Available length"
            valueMm={config.space.lengthMm}
            onChange={(lengthMm) => setSpace({ lengthMm })}
            minMm={1500}
            maxMm={15000}
            stepMm={100}
          />
          <DimensionField
            label="Available width"
            valueMm={config.space.widthMm}
            onChange={(widthMm) => setSpace({ widthMm })}
            minMm={1500}
            maxMm={15000}
            stepMm={100}
          />
          <DimensionField
            label="Available height"
            valueMm={config.space.heightMm}
            onChange={(heightMm) => setSpace({ heightMm })}
            minMm={2000}
            maxMm={8000}
            stepMm={100}
          />
        </div>
      </Section>

      <Section title="People">
        <div className="max-w-xs">
          <Field
            label="How many people should it seat?"
            hint={`Used to check the seating layout. Roughly ${METRES_PER_SEAT} m of bench per person — an estimate, not a certified capacity.`}
          >
            <TextInput
              type="number"
              min={1}
              max={40}
              value={config.space.people ?? ""}
              placeholder="e.g. 6"
              onChange={(event) => {
                const value = Number(event.target.value);
                setSpace({
                  people: Number.isFinite(value) && value > 0 ? Math.round(value) : undefined,
                });
              }}
            />
          </Field>
        </div>
      </Section>

      <Section title="Recommendation">
        {recommendation ? (
          <Callout tone="ok" title={`Suggested size: ${recommendation.name}`}>
            <p>
              Based on the space and people you entered, {recommendation.name} is
              the closest standard footprint.{" "}
              {config.pavilion.sizePresetId === recommendation.id ? (
                <span className="font-medium text-ok">It is already selected.</span>
              ) : (
                <button
                  type="button"
                  onClick={() => setSizePreset(recommendation.id)}
                  className="font-medium text-brand-green underline underline-offset-2"
                >
                  Apply this size
                </button>
              )}
            </p>
            <p className="mt-2 text-xs">
              Standard footprints keep the product repeatable. Free-size geometry
              is a bespoke engineering project and is not offered in V1.
            </p>
          </Callout>
        ) : (
          <Callout tone="info">
            Enter your available space, or the number of people, and we will
            suggest the closest standard footprint. You can also pick one
            directly on the next step.
          </Callout>
        )}

        <div className="mt-4 rounded-card border border-line bg-white p-4 text-sm">
          <div className="flex flex-wrap justify-between gap-4">
            <span className="text-ink-muted">Currently selected pavilion</span>
            <span className="font-medium text-ink">
              {formatFootprint(config.pavilion.widthMm, config.pavilion.lengthMm)} ·{" "}
              {derived.footprintM2.toFixed(1)} m²
            </span>
          </div>
          {derived.clearance.widthM !== undefined ||
          derived.clearance.lengthM !== undefined ? (
            <div className="mt-2 flex flex-wrap justify-between gap-4 text-xs text-ink-subtle">
              <span>Clearance remaining</span>
              <span className="tabular-nums">
                {formatClearance(derived.clearance.lengthM)} length ·{" "}
                {formatClearance(derived.clearance.widthM)} width ·{" "}
                {formatClearance(derived.clearance.heightM)} height
              </span>
            </div>
          ) : null}
        </div>
      </Section>
    </>
  );
}

function formatClearance(value: number | undefined): string {
  if (value === undefined) return "—";
  return `${value >= 0 ? "" : "−"}${Math.abs(value).toFixed(2)} m`;
}

/** Closest active preset that fits the stated space and seats the people. */
function recommendPreset(space: { lengthMm?: number; widthMm?: number; people?: number }) {
  if (!space.lengthMm && !space.widthMm && !space.people) return null;

  const candidates = SIZE_PRESETS.filter((preset) => {
    if (preset.status !== "active") return false;
    const width = meta<number>(preset, "widthMm") ?? 0;
    const length = meta<number>(preset, "lengthMm") ?? 0;
    const seats = meta<number>(preset, "seats") ?? 0;

    if (space.widthMm && width > space.widthMm) return false;
    if (space.lengthMm && length > space.lengthMm) return false;
    if (space.people && seats < space.people) return false;
    return true;
  });

  if (candidates.length === 0) return null;

  // Largest footprint that still fits gives the most usable space.
  return candidates.reduce((best, preset) => {
    const area =
      (meta<number>(preset, "widthMm") ?? 0) * (meta<number>(preset, "lengthMm") ?? 0);
    const bestArea =
      (meta<number>(best, "widthMm") ?? 0) * (meta<number>(best, "lengthMm") ?? 0);
    return area > bestArea ? preset : best;
  });
}
