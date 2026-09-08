"use client";

import { AQUARIUM_POSITIONS, AQUARIUM_SHAPES } from "@shared/catalog";
import { useConfiguratorStore } from "@/store/useConfiguratorStore";
import { estimateAquarium, HARDWARE_MASS_FACTOR, OPERATING_VOLUME_FACTOR } from "@shared/aquarium/volume";
import { DISCLAIMERS } from "@/constants/brand";
import { Callout } from "@/components/ui/Callout";
import { DimensionField, Toggle } from "@/components/ui/Field";
import { OptionCard } from "@/components/ui/OptionCard";
import { OptionGrid, Section } from "@/components/ui/Section";
import { formatKilograms, formatLitres } from "@/lib/format";

export function AquariumStep() {
  const config = useConfiguratorStore((state) => state.config);
  const setAquariumEnabled = useConfiguratorStore((state) => state.setAquariumEnabled);
  const setAquariumPosition = useConfiguratorStore((state) => state.setAquariumPosition);
  const setAquariumShape = useConfiguratorStore((state) => state.setAquariumShape);
  const setAquariumDimension = useConfiguratorStore((state) => state.setAquariumDimension);

  const estimates = estimateAquarium(config.aquarium);
  const isCube = config.aquarium.shapeId === "AQSHAPE-CUBE";

  return (
    <>
      <Toggle
        checked={config.aquarium.enabled}
        onChange={setAquariumEnabled}
        label="Include an aquarium"
        description="Turning this off clears the tank, its dimensions and every species you selected."
      />

      {config.aquarium.enabled ? (
        <>
          <Section title="Position">
            <OptionGrid columns={4}>
              {AQUARIUM_POSITIONS.map((item) => (
                <OptionCard
                  key={item.id}
                  item={item}
                  compact
                  selected={config.aquarium.positionId === item.id}
                  onSelect={setAquariumPosition}
                />
              ))}
            </OptionGrid>
          </Section>

          <Section title="Tank shape">
            <OptionGrid columns={4}>
              {AQUARIUM_SHAPES.map((item) => (
                <OptionCard
                  key={item.id}
                  item={item}
                  compact
                  selected={config.aquarium.shapeId === item.id}
                  onSelect={setAquariumShape}
                />
              ))}
            </OptionGrid>
          </Section>

          <Section
            title="Tank dimensions"
            description={isCube ? "A cube tank keeps all three dimensions equal." : undefined}
          >
            <div className="grid gap-3 sm:grid-cols-3">
              <DimensionField
                label="Length"
                unit="cm"
                valueMm={config.aquarium.lengthMm}
                onChange={(value) => setAquariumDimension("lengthMm", value)}
                minMm={300}
                maxMm={2000}
                stepMm={50}
              />
              <DimensionField
                label="Width"
                unit="cm"
                valueMm={config.aquarium.widthMm}
                onChange={(value) => setAquariumDimension("widthMm", value)}
                minMm={250}
                maxMm={900}
                stepMm={25}
              />
              <DimensionField
                label="Height"
                unit="cm"
                valueMm={config.aquarium.heightMm}
                onChange={(value) => setAquariumDimension("heightMm", value)}
                minMm={250}
                maxMm={1000}
                stepMm={25}
              />
            </div>
          </Section>

          <Section title="Estimated volume & mass">
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              <Metric
                label="Nominal volume"
                value={formatLitres(estimates.nominalVolumeL)}
                note="L × W × H of the bounding box."
              />
              <Metric
                label="Geometric volume"
                value={formatLitres(estimates.geometricVolumeL)}
                note="Adjusted for the tank shape."
              />
              <Metric
                label="Operating volume"
                value={formatLitres(estimates.operatingVolumeL)}
                note={`${Math.round(OPERATING_VOLUME_FACTOR * 100)}% of geometric, allowing for substrate and freeboard.`}
                highlight
              />
              <Metric
                label="Estimated filled mass"
                value={formatKilograms(estimates.estimatedFilledMassKg)}
                note={`Water plus an assumed ${Math.round(HARDWARE_MASS_FACTOR * 100)}% for tank, stand and equipment.`}
                highlight
              />
            </div>

            <Callout tone="review" title="Estimated — not an engineering approval" className="mt-4">
              {DISCLAIMERS.aquarium}
            </Callout>
          </Section>
        </>
      ) : (
        <Callout tone="info" className="mt-6">
          No aquarium in this design. The Aquatic Life step is hidden while the
          aquarium is off, and any species you had chosen have been cleared.
        </Callout>
      )}
    </>
  );
}

function Metric({
  label,
  value,
  note,
  highlight,
}: {
  label: string;
  value: string;
  note: string;
  highlight?: boolean;
}) {
  return (
    <div
      className={
        highlight
          ? "rounded-card border border-water/30 bg-water/5 p-4"
          : "rounded-card border border-line bg-white p-4"
      }
    >
      <p className="eyebrow text-ink-subtle">{label}</p>
      <p
        className={
          highlight
            ? "mt-1.5 font-display text-2xl font-semibold text-water"
            : "mt-1.5 font-display text-2xl font-semibold text-ink"
        }
      >
        {value}
      </p>
      <p className="mt-1.5 text-xs leading-relaxed text-ink-subtle">{note}</p>
    </div>
  );
}
