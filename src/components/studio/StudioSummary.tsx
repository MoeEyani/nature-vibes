"use client";

import { groupStudioLines, estimateSeats } from "@shared/studio/pricing";
import { designBounds, rectSize } from "@shared/studio/geometry";
import { useStudioPrice, useStudioStore, useStudioValidation } from "@/store/useStudioStore";
import { formatCurrency } from "@/lib/format";
import { Badge } from "@/components/ui/Badge";
import { SeverityBadge } from "@/components/configurator/ValidationList";
import { cn } from "@/components/ui/cn";

/**
 * Live readout of the design: what it contains, what it is estimated to cost,
 * and what the rules engine makes of it.
 *
 * Clicking a finding selects the first element it affects, so a warning leads
 * straight to the thing that caused it.
 */
export function StudioSummary() {
  const design = useStudioStore((state) => state.design);
  const select = useStudioStore((state) => state.select);
  const breakdown = useStudioPrice();
  const validation = useStudioValidation();

  const groups = groupStudioLines(design);
  const envelope = rectSize(designBounds(design));
  const seats = estimateSeats(design);

  return (
    <div>
      <div className="border-b border-line px-4 py-3">
        <div className="flex items-baseline justify-between gap-3">
          <h2 className="eyebrow text-ink-muted">Estimated total</h2>
          {breakdown.isEstimate ? <Badge tone="warning">Placeholder</Badge> : null}
        </div>
        <p className="font-display mt-1 text-2xl font-semibold tabular-nums text-brand-green">
          {formatCurrency(breakdown.total)}
        </p>
      </div>

      <dl className="grid grid-cols-2 gap-px bg-line text-sm">
        <Stat label="Elements" value={String(design.elements.length)} />
        <Stat label="Est. seats" value={String(seats)} />
        <Stat
          label="Overall width"
          value={envelope.widthMm ? `${(envelope.widthMm / 1000).toFixed(2)} m` : "—"}
        />
        <Stat
          label="Overall depth"
          value={envelope.depthMm ? `${(envelope.depthMm / 1000).toFixed(2)} m` : "—"}
        />
      </dl>

      {groups.length > 0 ? (
        <section className="px-4 py-3">
          <h3 className="eyebrow mb-2 text-ink-subtle">Contents</h3>
          <ul className="divide-y divide-line/70 text-sm">
            {groups.map((group) => (
              <li key={group.typeId} className="flex justify-between gap-3 py-1.5">
                <span className="text-ink">
                  {group.name}
                  {group.count > 1 ? (
                    <span className="ml-1.5 text-ink-subtle">× {group.count}</span>
                  ) : null}
                </span>
                <span className="tabular-nums text-ink-muted">
                  {formatCurrency(group.subtotal)}
                </span>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      <section className="border-t border-line px-4 py-3">
        <div className="mb-2 flex items-center justify-between gap-3">
          <h3 className="eyebrow text-ink-subtle">
            Checks ({validation.messages.length})
          </h3>
          <SeverityBadge severity={validation.status} />
        </div>

        <ul className="space-y-2">
          {validation.messages.map((entry) => (
            <li key={entry.code}>
              <button
                type="button"
                disabled={entry.affectedIds.length === 0}
                onClick={() => select(entry.affectedIds[0] ?? null)}
                className={cn(
                  "w-full rounded-lg border p-2.5 text-left transition-colors",
                  entry.severity === "incompatible" && "border-danger/30 bg-danger/5",
                  entry.severity === "review_required" && "border-review/30 bg-review/5",
                  entry.severity === "warning" && "border-warn/30 bg-warn/5",
                  entry.severity === "ok" && "border-ok/25 bg-ok/5",
                  entry.affectedIds.length > 0 && "hover:brightness-95",
                )}
              >
                <span className="block text-xs font-medium text-ink">
                  {entry.title}
                </span>
                <span className="mt-0.5 block text-[11px] leading-relaxed text-ink-muted">
                  {entry.message}
                </span>
                {entry.affectedIds.length > 0 ? (
                  <span className="mt-1 block text-[10px] uppercase tracking-wider text-brand-green">
                    Show on canvas →
                  </span>
                ) : null}
              </button>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="bg-white px-4 py-2.5">
      <dt className="text-[11px] uppercase tracking-wider text-ink-subtle">{label}</dt>
      <dd className="mt-0.5 font-medium tabular-nums text-ink">{value}</dd>
    </div>
  );
}
