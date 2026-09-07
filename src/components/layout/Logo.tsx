import { BRAND } from "@/constants/brand";
import { cn } from "@/components/ui/cn";

/** Wordmark + leaf mark. Reads the name from BRAND so rebranding is one edit. */
export function Logo({
  tone = "dark",
  className,
}: {
  tone?: "dark" | "light";
  className?: string;
}) {
  return (
    <span className={cn("inline-flex items-center gap-2.5", className)}>
      <svg viewBox="0 0 32 32" className="size-7 shrink-0" aria-hidden>
        <path
          d="M16 30C16 30 6 24 6 14c0-6 4-11 10-12 6 1 10 6 10 12 0 10-10 16-10 16Z"
          fill={tone === "light" ? "#7fae6b" : "#1d5138"}
          opacity="0.35"
        />
        <path
          d="M16 30V6M16 14c-3-1-5-3-6-6M16 18c3-1 5-3 6-6"
          stroke={tone === "light" ? "#f5f0e4" : "#1d5138"}
          strokeWidth="1.6"
          strokeLinecap="round"
          fill="none"
        />
      </svg>
      <span className="leading-none">
        <span
          className={cn(
            "font-display block text-lg font-semibold tracking-tight",
            tone === "light" ? "text-cream" : "text-deep-green",
          )}
        >
          {BRAND.projectName}
        </span>
        <span
          className={cn(
            "mt-0.5 block text-[9px] uppercase tracking-[0.2em]",
            tone === "light" ? "text-cream/70" : "text-ink-subtle",
          )}
        >
          {BRAND.tagline}
        </span>
      </span>
    </span>
  );
}
