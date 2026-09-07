import type { ReactNode } from "react";
import { cn } from "./cn";

type Tone = "neutral" | "ok" | "warning" | "review" | "danger" | "brand" | "water";

const TONES: Record<Tone, string> = {
  neutral: "bg-sand/60 text-ink-muted",
  ok: "bg-ok/10 text-ok",
  warning: "bg-warn/10 text-warn",
  review: "bg-review/10 text-review",
  danger: "bg-danger/10 text-danger",
  brand: "bg-brand-green/10 text-brand-green",
  water: "bg-water/10 text-water",
};

export function Badge({
  tone = "neutral",
  children,
  className,
}: {
  tone?: Tone;
  children: ReactNode;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-pill px-2.5 py-1 text-xs font-medium",
        TONES[tone],
        className,
      )}
    >
      {children}
    </span>
  );
}
