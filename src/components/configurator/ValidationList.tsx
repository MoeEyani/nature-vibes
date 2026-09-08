"use client";

import Link from "next/link";
import type { ValidationMessage, ValidationSeverity } from "@shared/configuration/schema";
import { SEVERITY_LABEL } from "@shared/rules/types";
import { Badge } from "@/components/ui/Badge";
import { cn } from "@/components/ui/cn";

const TONE: Record<ValidationSeverity, "ok" | "warning" | "review" | "danger"> = {
  ok: "ok",
  warning: "warning",
  review_required: "review",
  incompatible: "danger",
};

export function SeverityBadge({ severity }: { severity: ValidationSeverity }) {
  return <Badge tone={TONE[severity]}>{SEVERITY_LABEL[severity]}</Badge>;
}

export function ValidationMessageCard({ message }: { message: ValidationMessage }) {
  const tone = TONE[message.severity];

  return (
    <li
      className={cn(
        "rounded-card border p-4",
        tone === "danger" && "border-danger/30 bg-danger/5",
        tone === "review" && "border-review/30 bg-review/5",
        tone === "warning" && "border-warn/30 bg-warn/5",
        tone === "ok" && "border-ok/25 bg-ok/5",
      )}
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <p className="font-medium text-ink">{message.title}</p>
        <SeverityBadge severity={message.severity} />
      </div>
      <p className="mt-1.5 text-sm leading-relaxed text-ink-muted">{message.message}</p>

      <div className="mt-3 flex flex-wrap items-center gap-3">
        {message.step ? (
          <Link
            href={`/design/${message.step}`}
            className="text-xs font-medium text-brand-green underline-offset-2 hover:underline"
          >
            Go to {message.step.replace("-", " ")} step →
          </Link>
        ) : null}
        <span className="font-mono text-[10px] uppercase tracking-wider text-ink-subtle">
          {message.code}
        </span>
      </div>
    </li>
  );
}

export function ValidationList({ messages }: { messages: ValidationMessage[] }) {
  if (messages.length === 0) {
    return (
      <p className="rounded-card border border-ok/25 bg-ok/5 p-4 text-sm text-ink-muted">
        No issues raised by the rules engine for this configuration.
      </p>
    );
  }

  return (
    <ul className="space-y-3">
      {messages.map((message) => (
        <ValidationMessageCard key={message.code} message={message} />
      ))}
    </ul>
  );
}
