import type { ReactNode } from "react";
import { cn } from "./cn";

type Tone = "info" | "warning" | "review" | "danger" | "ok";

const TONES: Record<Tone, { wrap: string; label: string }> = {
  info: { wrap: "border-line bg-sand/40", label: "text-ink-muted" },
  ok: { wrap: "border-ok/25 bg-ok/5", label: "text-ok" },
  warning: { wrap: "border-warn/30 bg-warn/5", label: "text-warn" },
  review: { wrap: "border-review/30 bg-review/5", label: "text-review" },
  danger: { wrap: "border-danger/30 bg-danger/5", label: "text-danger" },
};

/**
 * Standing disclaimer / advisory block. Used everywhere a number or claim
 * needs its "placeholder, not engineering data" context attached to it.
 */
export function Callout({
  tone = "info",
  title,
  children,
  className,
}: {
  tone?: Tone;
  title?: string;
  children: ReactNode;
  className?: string;
}) {
  const styles = TONES[tone];
  return (
    <div className={cn("rounded-card border p-4 text-sm", styles.wrap, className)}>
      {title ? (
        <p className={cn("mb-1 font-semibold", styles.label)}>{title}</p>
      ) : null}
      <div className="text-ink-muted leading-relaxed">{children}</div>
    </div>
  );
}
