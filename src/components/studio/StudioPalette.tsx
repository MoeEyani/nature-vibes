"use client";

import { useEffect, useState } from "react";
import {
  STUDIO_GROUPS,
  typesByGroup,
  type StudioElementType,
} from "@shared/studio/catalog";
import { assemblyStartingPrice } from "@shared/studio/pricing";
import { useStudioStore } from "@/store/useStudioStore";
import { formatCurrency } from "@/lib/format";
import { cn } from "@/components/ui/cn";

/**
 * The element palette.
 *
 * Two ways to place, because both are natural and one of them has to work on
 * a touch screen:
 *  - press and drag onto the canvas, dropping where you want it;
 *  - tap, which drops it at the centre of the site.
 *
 * The drag uses pointer events rather than HTML5 drag-and-drop: the canvas is
 * a WebGL surface, and pointer events are what the 3D layer already speaks.
 */
export function StudioPalette() {
  const placingTypeId = useStudioStore((state) => state.placingTypeId);
  const beginPlacement = useStudioStore((state) => state.beginPlacement);
  const cancelDrag = useStudioStore((state) => state.cancelDrag);
  const addAtCentre = useStudioStore((state) => state.addAtCentre);

  return (
    <div className="nv-scroll flex h-full flex-col overflow-y-auto lg:h-[calc(100vh-8rem)]">
      <div className="border-b border-line px-4 py-3">
        <h2 className="eyebrow text-ink-muted">Elements</h2>
        <p className="mt-1 text-xs leading-relaxed text-ink-subtle">
          Drag onto the canvas, or tap to drop one in the middle.
        </p>
      </div>

      {STUDIO_GROUPS.map((group) => {
        const types = typesByGroup(group);
        if (types.length === 0) return null;

        return (
          <section key={group} className="border-b border-line/70 px-3 py-3">
            <h3 className="eyebrow mb-2 px-1 text-ink-subtle">{group}</h3>
            <ul className="space-y-1.5">
              {types.map((type) => (
                <li key={type.id}>
                  <PaletteItem
                    type={type}
                    active={placingTypeId === type.id}
                    onBegin={() => beginPlacement(type.id)}
                    onTap={() => {
                      addAtCentre(type.id);
                      cancelDrag();
                    }}
                  />
                </li>
              ))}
            </ul>
          </section>
        );
      })}

      <p className="px-4 py-4 text-[11px] leading-relaxed text-ink-subtle">
        Sizes and prices are placeholder seed values for this prototype, not
        manufacturing data.
      </p>
    </div>
  );
}

function PaletteItem({
  type,
  active,
  onBegin,
  onTap,
}: {
  type: StudioElementType;
  active: boolean;
  onBegin: () => void;
  onTap: () => void;
}) {
  return (
    <button
      type="button"
      data-testid={`palette-${type.id}`}
      aria-label={`Add ${type.name}`}
      title={type.description}
      onPointerDown={(event) => {
        // Left button / touch only, and never start a text selection.
        if (event.button !== 0) return;
        event.preventDefault();
        onBegin();
      }}
      onPointerUp={() => {
        // Released without ever reaching the canvas: treat it as a tap.
        if (useStudioStore.getState().ghost === null) onTap();
      }}
      className={cn(
        "flex w-full cursor-grab items-center gap-3 rounded-lg border p-2.5 text-left transition-colors active:cursor-grabbing",
        active
          ? "border-brand-green bg-brand-green/10"
          : "border-transparent bg-white hover:border-line hover:bg-sand/30",
      )}
    >
      <ElementIcon type={type} />
      <span className="min-w-0 flex-1">
        <span className="block truncate text-sm font-medium text-ink">
          {type.name}
        </span>
        <span className="block truncate text-[11px] text-ink-subtle">
          {(type.defaultSize.widthMm / 1000).toFixed(2)} ×{" "}
          {(type.defaultSize.depthMm / 1000).toFixed(2)} m ·{" "}
          {/* An assembly has no price of its own; quote the parts it starts
              with, so the palette never claims a pavilion is free. */}
          {type.assembly ? (
            <>from {formatCurrency(assemblyStartingPrice(type.id))}</>
          ) : (
            <>
              {formatCurrency(type.price.amount)}
              {type.priceMode === "perLinearMetre" ? "/m" : null}
              {type.priceMode === "perSquareMetre" ? "/m²" : null}
            </>
          )}
        </span>
      </span>
    </button>
  );
}

/** A tiny plan-view glyph, drawn from the type's own proportions. */
function ElementIcon({ type }: { type: StudioElementType }) {
  const { widthMm, depthMm } = type.defaultSize;
  const longest = Math.max(widthMm, depthMm);
  const w = Math.max(4, (widthMm / longest) * 22);
  const d = Math.max(4, (depthMm / longest) * 22);

  return (
    <span
      aria-hidden
      className="flex size-9 shrink-0 items-center justify-center rounded-md bg-sand/60"
    >
      <svg viewBox="0 0 28 28" className="size-7">
        <rect
          x={14 - w / 2}
          y={14 - d / 2}
          width={w}
          height={d}
          rx="1.5"
          fill="var(--color-brand-green)"
          opacity="0.75"
        />
      </svg>
    </span>
  );
}

/**
 * A chip that follows the cursor while an element is being dragged in from
 * the palette, so the drag reads as a drag even before it reaches the canvas.
 */
export function DragChip() {
  const placingTypeId = useStudioStore((state) => state.placingTypeId);
  const cancelDrag = useStudioStore((state) => state.cancelDrag);
  const [point, setPoint] = useState<{ x: number; y: number } | null>(null);

  useEffect(() => {
    if (!placingTypeId) {
      setPoint(null);
      return;
    }

    const move = (event: PointerEvent) =>
      setPoint({ x: event.clientX, y: event.clientY });
    // Releasing anywhere other than the canvas abandons the placement.
    const up = () => window.setTimeout(() => cancelDrag(), 0);
    const key = (event: KeyboardEvent) => {
      if (event.key === "Escape") cancelDrag();
    };

    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", up);
    window.addEventListener("keydown", key);
    return () => {
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", up);
      window.removeEventListener("keydown", key);
    };
  }, [cancelDrag, placingTypeId]);

  if (!placingTypeId || !point) return null;

  return (
    <div
      aria-hidden
      className="pointer-events-none fixed z-50 -translate-x-1/2 -translate-y-1/2 rounded-pill bg-brand-green px-3 py-1.5 text-xs font-medium text-cream shadow-lift"
      style={{ left: point.x, top: point.y }}
    >
      Drop on the canvas
    </div>
  );
}
