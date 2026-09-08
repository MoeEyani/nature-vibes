"use client";

import dynamic from "next/dynamic";
import { useRef, useState } from "react";
import type { DesignConfiguration } from "@shared/configuration/schema";
import { derive } from "@shared/configuration/derive";
import { formatFootprint, formatLitres } from "@/lib/format";
import { cn } from "@/components/ui/cn";
import { ALL_LAYERS, type LayerVisibility, type OrbitControlsHandle } from "./Scene";

/**
 * The 3D viewport.
 *
 * The canvas is loaded client-side only — three.js has no business in the
 * server bundle, and the placeholder keeps the layout stable while it loads.
 */
const Scene = dynamic(() => import("./Scene").then((mod) => mod.Scene), {
  ssr: false,
  loading: () => <ViewportSkeleton />,
});

const LAYER_LABELS: { key: keyof LayerVisibility; label: string }[] = [
  { key: "frame", label: "Frame" },
  { key: "roof", label: "Roof" },
  { key: "seating", label: "Seating" },
  { key: "aquarium", label: "Aquarium" },
  { key: "planting", label: "Planting" },
  { key: "extras", label: "Add-ons" },
];

export function Viewport({
  config,
  className,
  showLayers = true,
}: {
  config: DesignConfiguration;
  className?: string;
  showLayers?: boolean;
}) {
  const controlsRef = useRef<OrbitControlsHandle | null>(null);
  const [layers, setLayers] = useState<LayerVisibility>(ALL_LAYERS);
  const derived = derive(config);

  const toggleLayer = (key: keyof LayerVisibility) =>
    setLayers((current) => ({ ...current, [key]: !current[key] }));

  return (
    <div
      className={cn(
        "relative overflow-hidden rounded-card border border-line bg-sand/30",
        className,
      )}
    >
      <Scene config={config} layers={layers} controlsRef={controlsRef} />

      {/* Reset view */}
      <button
        type="button"
        onClick={() => controlsRef.current?.reset()}
        className="absolute right-3 top-3 inline-flex items-center gap-1.5 rounded-pill bg-white/90 px-3 py-1.5 text-xs font-medium text-ink shadow-soft backdrop-blur transition-colors hover:text-brand-green"
      >
        <svg viewBox="0 0 20 20" className="size-3.5" fill="none" stroke="currentColor" strokeWidth="1.8">
          <path d="M3 10a7 7 0 1 1 2.1 5" strokeLinecap="round" />
          <path d="M3 15v-4h4" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
        Reset view
      </button>

      {/* Module visibility — kept clear of the reset button on narrow panels. */}
      {showLayers ? (
        <div className="absolute left-3 right-28 top-3 flex flex-wrap gap-1.5">
          {LAYER_LABELS.map(({ key, label }) => (
            <button
              key={key}
              type="button"
              aria-pressed={layers[key]}
              onClick={() => toggleLayer(key)}
              className={cn(
                "rounded-pill px-2.5 py-1 text-[11px] font-medium shadow-soft backdrop-blur transition-colors",
                layers[key]
                  ? "bg-brand-green/90 text-cream"
                  : "bg-white/80 text-ink-subtle line-through",
              )}
            >
              {label}
            </button>
          ))}
        </div>
      ) : null}

      {/* Live readout */}
      <div className="pointer-events-none absolute inset-x-3 bottom-3 flex flex-wrap items-center justify-between gap-2 rounded-lg bg-white/85 px-3 py-2 text-[11px] text-ink-muted backdrop-blur">
        <span>
          <span className="font-medium text-ink">
            {formatFootprint(config.pavilion.widthMm, config.pavilion.lengthMm)}
          </span>{" "}
          footprint · {derived.footprintM2.toFixed(1)} m²
        </span>
        {config.aquarium.enabled && derived.aquarium.hasDimensions ? (
          <span>
            Tank ≈{" "}
            <span className="font-medium text-water">
              {formatLitres(derived.aquarium.operatingVolumeL)}
            </span>{" "}
            operating (estimated)
          </span>
        ) : null}
        <span className="text-ink-subtle">Drag to orbit · scroll to zoom</span>
      </div>
    </div>
  );
}

function ViewportSkeleton() {
  return (
    <div className="flex h-full min-h-72 w-full items-center justify-center bg-sand/40">
      <div className="text-center">
        <div
          className="mx-auto size-8 animate-spin rounded-full border-2 border-line border-t-brand-green"
          aria-hidden
        />
        <p className="mt-3 text-xs text-ink-subtle">Preparing the 3D preview…</p>
      </div>
    </div>
  );
}
