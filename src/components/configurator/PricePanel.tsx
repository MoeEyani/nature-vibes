"use client";

import { DISCLAIMERS } from "@/constants/brand";
import { groupLines, type PriceBreakdown } from "@/domain/pricing/calculatePrice";
import { formatCurrency } from "@/lib/format";
import { Badge } from "@/components/ui/Badge";
import { cn } from "@/components/ui/cn";

/** Compact price readout for the wizard sidebar. */
export function PriceSummary({
  breakdown,
  className,
}: {
  breakdown: PriceBreakdown;
  className?: string;
}) {
  return (
    <div className={cn("rounded-card border border-line bg-white p-4", className)}>
      <div className="flex items-baseline justify-between gap-3">
        <span className="eyebrow text-ink-subtle">
          {breakdown.isEstimate ? "Estimated total" : "Total"}
        </span>
        {breakdown.isEstimate ? <Badge tone="warning">Placeholder</Badge> : null}
      </div>
      <p className="font-display mt-1 text-3xl font-semibold text-brand-green tabular-nums">
        {formatCurrency(breakdown.total)}
      </p>
      <p className="mt-2 text-xs leading-relaxed text-ink-subtle">{DISCLAIMERS.price}</p>
    </div>
  );
}

/** Full itemised breakdown for the review step. */
export function PriceBreakdownTable({ breakdown }: { breakdown: PriceBreakdown }) {
  const groups = groupLines(breakdown);

  return (
    <div className="overflow-hidden rounded-card border border-line bg-white">
      <div className="nv-scroll overflow-x-auto">
        <table className="w-full min-w-[38rem] text-sm">
          <thead>
            <tr className="border-b border-line bg-sand/40 text-left">
              <th scope="col" className="px-4 py-2.5 font-medium text-ink-muted">
                Item
              </th>
              <th scope="col" className="px-4 py-2.5 text-right font-medium text-ink-muted">
                Qty
              </th>
              <th scope="col" className="px-4 py-2.5 text-right font-medium text-ink-muted">
                Unit
              </th>
              <th scope="col" className="px-4 py-2.5 text-right font-medium text-ink-muted">
                Subtotal
              </th>
            </tr>
          </thead>

          {groups.map((group) => (
            <tbody key={group.group} className="border-b border-line last:border-0">
              <tr>
                <th
                  colSpan={4}
                  scope="colgroup"
                  className="eyebrow px-4 pb-1 pt-4 text-left text-ink-subtle"
                >
                  {group.group}
                </th>
              </tr>
              {group.lines.map((line) => (
                <tr key={`${line.itemId}-${line.description}`} className="align-top">
                  <td className="px-4 py-2">
                    <span className="block text-ink">{line.description}</span>
                    <span className="mt-0.5 flex flex-wrap items-center gap-2">
                      {line.sku ? (
                        <span className="font-mono text-[10px] uppercase tracking-wider text-ink-subtle">
                          {line.sku}
                        </span>
                      ) : null}
                      {line.priceStatus === "placeholder" ? (
                        <span className="text-[10px] uppercase tracking-wider text-warn">
                          placeholder
                        </span>
                      ) : null}
                    </span>
                    {line.note ? (
                      <span className="mt-0.5 block text-xs text-ink-subtle">
                        {line.note}
                      </span>
                    ) : null}
                  </td>
                  <td className="whitespace-nowrap px-4 py-2 text-right tabular-nums text-ink-muted">
                    {line.quantity} {line.unit}
                  </td>
                  <td className="whitespace-nowrap px-4 py-2 text-right tabular-nums text-ink-muted">
                    {formatCurrency(line.unitPrice)}
                  </td>
                  <td className="whitespace-nowrap px-4 py-2 text-right font-medium tabular-nums text-ink">
                    {formatCurrency(line.subtotal)}
                  </td>
                </tr>
              ))}
              <tr>
                <td colSpan={3} className="px-4 pb-2 text-right text-xs text-ink-subtle">
                  {group.group} subtotal
                </td>
                <td className="px-4 pb-2 text-right text-xs font-medium tabular-nums text-ink-muted">
                  {formatCurrency(group.subtotal)}
                </td>
              </tr>
            </tbody>
          ))}

          <tfoot className="border-t-2 border-line bg-sand/30">
            <tr>
              <td colSpan={3} className="px-4 py-3 text-right font-medium text-ink">
                {breakdown.isEstimate ? "Estimated total" : "Total"}
              </td>
              <td className="px-4 py-3 text-right font-display text-xl font-semibold tabular-nums text-brand-green">
                {formatCurrency(breakdown.total)}
              </td>
            </tr>
          </tfoot>
        </table>
      </div>
    </div>
  );
}
