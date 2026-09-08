"use client";

import { PAVILION_FAMILIES, SHAPES, SIZE_PRESETS, meta } from "@shared/catalog";
import { useConfiguratorStore } from "@/store/useConfiguratorStore";
import { Callout } from "@/components/ui/Callout";
import { OptionCard } from "@/components/ui/OptionCard";
import { OptionGrid, Section } from "@/components/ui/Section";
import { formatFootprint } from "@/lib/format";

export function PavilionStep() {
  const config = useConfiguratorStore((state) => state.config);
  const setShape = useConfiguratorStore((state) => state.setShape);
  const setSizePreset = useConfiguratorStore((state) => state.setSizePreset);

  // Only show the presets offered for the chosen shape, plus future ones.
  const presets = SIZE_PRESETS.filter(
    (preset) =>
      preset.status !== "active" ||
      (preset.compatibleWith?.includes(config.pavilion.shapeId) ?? true),
  );

  return (
    <>
      <Section
        title="Platform"
        description="V1 ships one mother platform so the flow, the rules and the manufacturing can be validated before the family grows."
      >
        <OptionGrid columns={2}>
          {PAVILION_FAMILIES.map((item) => (
            <OptionCard
              key={item.id}
              item={item}
              selected={config.pavilion.familyId === item.id}
              onSelect={() => undefined}
            />
          ))}
        </OptionGrid>
      </Section>

      <Section title="Shape">
        <OptionGrid columns={4}>
          {SHAPES.map((item) => (
            <OptionCard
              key={item.id}
              item={item}
              compact
              selected={config.pavilion.shapeId === item.id}
              onSelect={setShape}
              media={<ShapeThumb id={item.id} />}
            />
          ))}
        </OptionGrid>
      </Section>

      <Section
        title="Size"
        description="Standard footprints keep the product repeatable and priceable."
      >
        <OptionGrid columns={4}>
          {presets.map((item) => (
            <OptionCard
              key={item.id}
              item={item}
              compact
              selected={config.pavilion.sizePresetId === item.id}
              onSelect={setSizePreset}
              footer={
                meta<number>(item, "seats") ? (
                  <span className="text-[11px] text-ink-subtle">
                    ≈ {meta<number>(item, "seats")} seats
                  </span>
                ) : null
              }
            />
          ))}
        </OptionGrid>
      </Section>

      <Callout tone="warning" title="Concept dimensions" className="mt-6">
        The {formatFootprint(config.pavilion.widthMm, config.pavilion.lengthMm)}{" "}
        footprint and {(config.pavilion.heightMm / 1000).toFixed(2)} m height are
        concept seed values from the project brief. Final manufacturing
        dimensions, frame sections and anchoring are still{" "}
        <span className="font-medium">Needs Measurement</span>.
      </Callout>
    </>
  );
}

function ShapeThumb({ id }: { id: string }) {
  const shapes: Record<string, string> = {
    "SHAPE-SQUARE": "M22 14h36v36H22Z",
    "SHAPE-RECT": "M10 18h60v28H10Z",
    "SHAPE-HEX": "M40 10 66 24v26L40 64 14 50V24Z",
    "SHAPE-CUSTOM": "M14 20h28l14 12 12 6-10 22H20Z",
  };

  return (
    <div className="flex h-16 w-full items-center justify-center rounded-lg bg-sand/50" aria-hidden>
      <svg viewBox="0 0 80 64" className="h-12">
        <path
          d={shapes[id] ?? shapes["SHAPE-SQUARE"]}
          fill="none"
          stroke="var(--color-brand-green)"
          strokeWidth="2.5"
          strokeLinejoin="round"
        />
      </svg>
    </div>
  );
}
