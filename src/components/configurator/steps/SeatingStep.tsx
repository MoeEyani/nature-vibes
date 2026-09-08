"use client";

import { FABRICS, SEATING_LAYOUTS, SEATING_STYLES, getItem, meta } from "@shared/catalog";
import { useConfiguratorStore } from "@/store/useConfiguratorStore";
import { derive } from "@shared/configuration/derive";
import { Callout } from "@/components/ui/Callout";
import { OptionCard } from "@/components/ui/OptionCard";
import { SwatchOption } from "@/components/ui/SwatchOption";
import { OptionGrid, Section } from "@/components/ui/Section";

export function SeatingStep() {
  const config = useConfiguratorStore((state) => state.config);
  const setSeatingLayout = useConfiguratorStore((state) => state.setSeatingLayout);
  const setSeatingStyle = useConfiguratorStore((state) => state.setSeatingStyle);
  const setFabric = useConfiguratorStore((state) => state.setFabric);

  const derived = derive(config);
  const selectedLayoutId = config.seating.enabled ? config.seating.layoutId : "SEAT-NONE";
  const style = getItem(config.seating.styleId);
  const showsFabric = config.seating.enabled && Boolean(meta<boolean>(style, "cushion"));

  return (
    <>
      <Section title="Layout">
        <OptionGrid columns={3}>
          {SEATING_LAYOUTS.map((item) => (
            <OptionCard
              key={item.id}
              item={item}
              selected={selectedLayoutId === item.id}
              onSelect={setSeatingLayout}
              media={<LayoutThumb sides={meta<string[]>(item, "sides") ?? []} />}
            />
          ))}
        </OptionGrid>
      </Section>

      {config.seating.enabled ? (
        <>
          <Section title="Seat style">
            <OptionGrid columns={3}>
              {SEATING_STYLES.map((item) => (
                <OptionCard
                  key={item.id}
                  item={item}
                  compact
                  selected={config.seating.styleId === item.id}
                  onSelect={setSeatingStyle}
                />
              ))}
            </OptionGrid>
          </Section>

          {showsFabric ? (
            <Section title="Cushion fabric">
              <div className="nv-scroll flex gap-3 overflow-x-auto pb-2" role="group">
                {FABRICS.map((item) => (
                  <SwatchOption
                    key={item.id}
                    item={item}
                    selected={config.seating.fabricId === item.id}
                    onSelect={setFabric}
                  />
                ))}
              </div>
            </Section>
          ) : null}

          <Callout tone="info" className="mt-6">
            This layout builds roughly{" "}
            <span className="font-medium text-ink">
              {derived.seatingRunM.toFixed(1)} m
            </span>{" "}
            of bench — an estimated{" "}
            <span className="font-medium text-ink">{derived.estimatedSeats} seats</span>{" "}
            at 0.6 m per person. Seat counts are indicative and depend on the
            final seat depth and armrest details.
          </Callout>
        </>
      ) : (
        <Callout tone="info" className="mt-6">
          Seating is off, so seat style and cushion fabric have been cleared from
          the design. Choose any layout above to turn it back on.
        </Callout>
      )}
    </>
  );
}

/** Plan-view diagram of which sides carry a bench. */
function LayoutThumb({ sides }: { sides: string[] }) {
  const runs: Record<string, { x: number; y: number; w: number; h: number }> = {
    north: { x: 14, y: 12, w: 52, h: 8 },
    south: { x: 14, y: 48, w: 52, h: 8 },
    west: { x: 8, y: 18, w: 8, h: 32 },
    east: { x: 64, y: 18, w: 8, h: 32 },
  };

  return (
    <div className="flex h-20 w-full items-center justify-center rounded-lg bg-sand/50" aria-hidden>
      <svg viewBox="0 0 80 68" className="h-16">
        <rect
          x="8"
          y="10"
          width="64"
          height="48"
          rx="3"
          fill="none"
          stroke="var(--color-line)"
          strokeWidth="2"
        />
        {sides.map((side) => {
          const run = runs[side];
          if (!run) return null;
          return (
            <rect
              key={side}
              x={run.x}
              y={run.y}
              width={run.w}
              height={run.h}
              rx="2.5"
              fill="var(--color-brand-green)"
              opacity="0.85"
            />
          );
        })}
        {sides.length === 0 ? (
          <text
            x="40"
            y="38"
            textAnchor="middle"
            fontSize="10"
            fill="var(--color-ink-subtle)"
          >
            empty
          </text>
        ) : null}
      </svg>
    </div>
  );
}
