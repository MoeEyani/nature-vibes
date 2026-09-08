"use client";

import { useConfiguratorStore, useValidation } from "@/store/useConfiguratorStore";
import { groupChecks } from "@shared/rules/evaluateConfiguration";
import { SEVERITY_LABEL } from "@shared/rules/types";
import { Callout } from "@/components/ui/Callout";
import { cn } from "@/components/ui/cn";
import { SeverityBadge, ValidationMessageCard } from "../ValidationList";

/**
 * Design validation.
 *
 * The checklist reports every group, not only the failures, so the customer
 * sees what was checked. It never claims engineering approval: the best
 * possible outcome is "no blocking issues found".
 */
export function ValidationStep() {
  const config = useConfiguratorStore((state) => state.config);
  const validation = useValidation();
  const groups = groupChecks(validation);

  const headline =
    validation.counts.incompatible > 0
      ? {
          tone: "danger" as const,
          title: "This design cannot be built as configured",
          body: "One or more selections conflict. Resolve the items marked Incompatible before requesting a quote.",
        }
      : validation.counts.review_required > 0
        ? {
            tone: "review" as const,
            title: "Engineering review required",
            body: "Nothing blocks the quote request, but parts of this design must be verified by a qualified engineer before it can be manufactured or installed. Our team will handle that with you.",
          }
        : {
            tone: "ok" as const,
            title: "No blocking issues found",
            body: "Every logical check passed. This is a compatibility result from placeholder data — it is not a structural, electrical or aquatic approval.",
          };

  return (
    <div className="space-y-6">
      <Callout tone={headline.tone} title={headline.title}>
        {headline.body}
      </Callout>

      <div className="grid gap-4 lg:grid-cols-[minmax(0,20rem)_1fr]">
        <div className="h-fit overflow-hidden rounded-card border border-line bg-white">
          <h3 className="eyebrow border-b border-line bg-sand/40 px-4 py-3 text-ink-muted">
            Checklist
          </h3>
          <ul className="divide-y divide-line">
            {groups.map((group) => (
              <li
                key={group.id}
                className="flex items-center justify-between gap-3 px-4 py-2.5 text-sm"
              >
                <span className="text-ink">{group.label}</span>
                <span
                  className={cn(
                    "shrink-0 text-xs font-medium",
                    group.status === "ok" && "text-ok",
                    group.status === "warning" && "text-warn",
                    group.status === "review_required" && "text-review",
                    group.status === "incompatible" && "text-danger",
                  )}
                >
                  {SEVERITY_LABEL[group.status]}
                </span>
              </li>
            ))}
          </ul>

          <div className="border-t border-line bg-sand/30 px-4 py-3">
            <div className="flex items-center justify-between text-sm">
              <span className="font-medium text-ink">Overall</span>
              <SeverityBadge severity={validation.status} />
            </div>
          </div>
        </div>

        <div>
          <h3 className="eyebrow mb-3 text-ink-muted">
            Findings ({validation.messages.length})
          </h3>
          {validation.messages.length === 0 ? (
            <p className="rounded-card border border-ok/25 bg-ok/5 p-4 text-sm text-ink-muted">
              No findings for this configuration.
            </p>
          ) : (
            <ul className="space-y-3">
              {validation.messages.map((message) => (
                <ValidationMessageCard key={message.code} message={message} />
              ))}
            </ul>
          )}
        </div>
      </div>

      <Callout tone="info" title="What this check is and is not">
        These are logical and product-compatibility checks written against
        placeholder seed data ({config.pavilion.familyId} demo catalog). The
        configurator never issues structural, electrical, water or aquatic
        approvals. Any item marked{" "}
        <span className="font-medium">Engineering Review Required</span> stays
        open until a qualified professional signs it off.
      </Callout>
    </div>
  );
}
