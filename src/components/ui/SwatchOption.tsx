"use client";

import type { CatalogItem } from "@/types/catalog";
import { meta } from "@/data/catalog";
import { formatCurrency } from "@/lib/format";
import { cn } from "./cn";

/** Compact colour/finish picker used for frame finishes and cushion fabrics. */
export function SwatchOption({
  item,
  selected,
  onSelect,
}: {
  item: CatalogItem;
  selected: boolean;
  onSelect: (id: string) => void;
}) {
  const available = item.status === "active";
  const swatch = meta<string>(item, "swatch");
  const isGradient = !swatch || swatch === "linear-gradient";

  return (
    <button
      type="button"
      role="radio"
      aria-checked={selected}
      aria-disabled={!available}
      disabled={!available}
      title={available ? item.description : item.unavailableReason}
      onClick={() => available && onSelect(item.id)}
      className={cn(
        "flex w-28 shrink-0 flex-col gap-2 rounded-card border p-2 text-left transition-all",
        "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-green",
        available
          ? "border-line hover:border-brand-green/60 cursor-pointer bg-white"
          : "border-line/60 cursor-not-allowed bg-sand/20 opacity-70",
        selected && available && "border-brand-green ring-1 ring-brand-green",
      )}
    >
      <span
        aria-hidden
        className="relative block h-14 w-full rounded-lg border border-line/70"
        style={
          isGradient
            ? {
                backgroundImage:
                  "conic-gradient(from 180deg, #d4577a, #e2a13a, #7fae6b, #2f7f8f, #7a5aa8, #d4577a)",
              }
            : { backgroundColor: swatch }
        }
      >
        {selected && available ? (
          <span className="absolute right-1 top-1 flex size-4 items-center justify-center rounded-full bg-brand-green text-cream">
            <svg viewBox="0 0 20 20" className="size-2.5" fill="none" stroke="currentColor" strokeWidth="3.5">
              <path d="M4 10.5 8 14.5 16 6" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </span>
        ) : null}
      </span>
      <span className="text-xs font-medium text-ink">{item.name}</span>
      {item.price ? (
        <span className="text-[11px] text-brand-green">
          +{formatCurrency(item.price.amount)}
        </span>
      ) : available ? (
        <span className="text-[11px] text-ink-subtle">Included</span>
      ) : (
        <span className="text-[11px] text-ink-subtle">Coming later</span>
      )}
    </button>
  );
}
