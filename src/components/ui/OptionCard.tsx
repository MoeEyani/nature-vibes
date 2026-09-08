"use client";

import type { ReactNode } from "react";
import type { CatalogItem } from "@shared/types/catalog";
import { formatCurrency } from "@/lib/format";
import { cn } from "./cn";
import { Badge } from "./Badge";

/**
 * The one selectable-option control used by every wizard step.
 *
 * It renders straight from a CatalogItem, which is what keeps options
 * data-driven: a new product is a seed-data record, not a new component.
 * `future`/`disabled` items still render — with their reason — instead of
 * disappearing, so the customer understands the product roadmap.
 */
export function OptionCard({
  item,
  selected,
  onSelect,
  media,
  footer,
  compact = false,
  multi = false,
}: {
  item: CatalogItem;
  selected: boolean;
  onSelect: (id: string) => void;
  /** Optional visual (swatch, procedural thumbnail). */
  media?: ReactNode;
  footer?: ReactNode;
  compact?: boolean;
  /** Renders a checkbox affordance instead of a radio tick. */
  multi?: boolean;
}) {
  const available = item.status === "active";
  const price = item.price;

  return (
    <button
      type="button"
      role={multi ? "checkbox" : "radio"}
      aria-checked={selected}
      aria-disabled={!available}
      disabled={!available}
      onClick={() => available && onSelect(item.id)}
      className={cn(
        "group relative flex w-full flex-col rounded-card border bg-white text-left transition-all",
        "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-green",
        compact ? "p-3" : "p-4",
        available
          ? "border-line hover:border-brand-green/60 hover:shadow-soft cursor-pointer"
          : "border-line/60 bg-sand/20 cursor-not-allowed opacity-70",
        selected && available && "border-brand-green ring-1 ring-brand-green shadow-soft",
      )}
    >
      {media ? <div className="mb-3">{media}</div> : null}

      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="font-medium text-ink">{item.name}</p>
          {item.description ? (
            <p className={cn("mt-1 text-sm leading-relaxed text-ink-muted", compact && "text-xs")}>
              {item.description}
            </p>
          ) : null}
        </div>

        <span
          aria-hidden
          className={cn(
            "mt-0.5 flex size-5 shrink-0 items-center justify-center border transition-colors",
            multi ? "rounded-md" : "rounded-full",
            selected && available
              ? "border-brand-green bg-brand-green text-cream"
              : "border-line bg-white",
          )}
        >
          {selected && available ? <CheckMark /> : null}
        </span>
      </div>

      {!available && item.unavailableReason ? (
        <p className="mt-3 rounded-lg bg-sand/60 px-3 py-2 text-xs leading-relaxed text-ink-muted">
          <span className="font-medium text-ink">
            {item.status === "future" ? "Coming later. " : "Unavailable. "}
          </span>
          {item.unavailableReason}
        </p>
      ) : null}

      <div className="mt-3 flex flex-wrap items-center gap-2">
        {!available ? (
          <Badge tone="neutral">
            {item.status === "future" ? "Coming later" : "Unavailable"}
          </Badge>
        ) : null}
        {price ? (
          <Badge tone={price.amount < 0 ? "ok" : "brand"}>
            {price.amount < 0 ? "" : "+"}
            {formatCurrency(price.amount)}
            {item.pricingMode === "perSquareMetre" ? " / m²" : null}
            {item.pricingMode === "perLinearMetre" ? " / m" : null}
            {item.pricingMode === "perUnit" ? " / unit" : null}
          </Badge>
        ) : available ? (
          <Badge tone="neutral">Included</Badge>
        ) : null}
        {footer}
      </div>

      {item.sku ? (
        <p className="mt-2 font-mono text-[10px] uppercase tracking-wider text-ink-subtle">
          {item.sku}
        </p>
      ) : null}
    </button>
  );
}

function CheckMark() {
  return (
    <svg viewBox="0 0 20 20" className="size-3.5" fill="none" stroke="currentColor" strokeWidth="3">
      <path d="M4 10.5 8 14.5 16 6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
