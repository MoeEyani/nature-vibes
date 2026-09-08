"use client";

import { ROOFS } from "@shared/catalog";
import { useConfiguratorStore } from "@/store/useConfiguratorStore";
import { OptionCard } from "@/components/ui/OptionCard";
import { OptionGrid, Section } from "@/components/ui/Section";
import { Callout } from "@/components/ui/Callout";

export function RoofStep() {
  const roofId = useConfiguratorStore((state) => state.config.roof.roofId);
  const setRoof = useConfiguratorStore((state) => state.setRoof);

  return (
    <>
      <Section title="Roof style" description="Watch the preview update as you switch.">
        <OptionGrid columns={3}>
          {ROOFS.map((item) => (
            <OptionCard
              key={item.id}
              item={item}
              selected={roofId === item.id}
              onSelect={setRoof}
              media={<RoofThumb id={item.id} />}
            />
          ))}
        </OptionGrid>
      </Section>

      <Callout tone="info" className="mt-6">
        Roof construction — panel build-up, falls, gutters, fixings and wind
        uplift — is not designed in this MVP. The preview shows the shape only.
      </Callout>
    </>
  );
}

function RoofThumb({ id }: { id: string }) {
  const paths: Record<string, React.ReactNode> = {
    "ROOF-PYRAMID": (
      <>
        <path d="M40 14 72 40H8Z" fill="var(--color-brand-green)" opacity="0.85" />
        <path d="M40 14 40 40" stroke="white" strokeWidth="1.2" opacity="0.5" />
      </>
    ),
    "ROOF-FLAT": <rect x="8" y="30" width="64" height="10" rx="2" fill="var(--color-brand-green)" opacity="0.85" />,
    "ROOF-PERGOLA": (
      <>
        {[12, 20, 28, 36, 44, 52, 60, 68].map((x) => (
          <rect key={x} x={x} y="28" width="4" height="12" rx="1.5" fill="var(--color-bark)" opacity="0.85" />
        ))}
      </>
    ),
    "ROOF-LOUVERS": (
      <>
        {[12, 24, 36, 48, 60].map((x) => (
          <rect
            key={x}
            x={x}
            y="28"
            width="12"
            height="3.5"
            rx="1.5"
            fill="var(--color-brand-green)"
            opacity="0.85"
            transform={`rotate(-22 ${x + 6} 30)`}
          />
        ))}
      </>
    ),
    "ROOF-CANOPY": (
      <path d="M8 34q32 16 64 0v6q-32 16-64 0Z" fill="var(--color-brand-green)" opacity="0.6" />
    ),
    "ROOF-GREEN": (
      <>
        <rect x="8" y="32" width="64" height="8" rx="2" fill="var(--color-bark)" opacity="0.7" />
        <path d="M14 32q6-8 12 0M32 32q6-8 12 0M50 32q6-8 12 0" fill="var(--color-leaf)" opacity="0.9" />
      </>
    ),
  };

  return (
    <div className="flex h-20 w-full items-center justify-center rounded-lg bg-sand/50" aria-hidden>
      <svg viewBox="0 0 80 56" className="h-16">
        {paths[id] ?? paths["ROOF-FLAT"]}
        <rect x="12" y="42" width="3" height="12" fill="var(--color-ink-subtle)" />
        <rect x="65" y="42" width="3" height="12" fill="var(--color-ink-subtle)" />
      </svg>
    </div>
  );
}
