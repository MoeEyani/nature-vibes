"use client";

import type { ComponentProps, ReactNode } from "react";
import { useId } from "react";
import { cn } from "./cn";

const CONTROL =
  "h-11 w-full rounded-lg border border-line bg-white px-3 text-sm text-ink " +
  "placeholder:text-ink-subtle focus:border-brand-green focus:outline-none " +
  "focus:ring-1 focus:ring-brand-green disabled:bg-sand/40";

export function Field({
  label,
  hint,
  error,
  required,
  children,
}: {
  label: string;
  hint?: string;
  error?: string;
  required?: boolean;
  children: ReactNode;
}) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-sm font-medium text-ink">
        {label}
        {required ? <span className="ml-0.5 text-danger">*</span> : null}
      </span>
      {children}
      {error ? (
        <span className="mt-1.5 block text-xs text-danger">{error}</span>
      ) : hint ? (
        <span className="mt-1.5 block text-xs text-ink-subtle">{hint}</span>
      ) : null}
    </label>
  );
}

export function TextInput({ className, ...props }: ComponentProps<"input">) {
  return <input className={cn(CONTROL, className)} {...props} />;
}

export function TextArea({ className, ...props }: ComponentProps<"textarea">) {
  return (
    <textarea
      className={cn(CONTROL, "h-auto min-h-24 py-2.5 leading-relaxed", className)}
      {...props}
    />
  );
}

export function Select({ className, children, ...props }: ComponentProps<"select">) {
  return (
    <select className={cn(CONTROL, className)} {...props}>
      {children}
    </select>
  );
}

/**
 * Numeric input with a slider, used for space and tank dimensions.
 * Values are millimetres internally and metres/centimetres on screen.
 */
export function DimensionField({
  label,
  valueMm,
  onChange,
  minMm,
  maxMm,
  stepMm = 50,
  hint,
  unit = "m",
}: {
  label: string;
  valueMm: number | undefined;
  onChange: (mm: number) => void;
  minMm: number;
  maxMm: number;
  stepMm?: number;
  hint?: string;
  unit?: "m" | "cm";
}) {
  const id = useId();
  const divisor = unit === "m" ? 1000 : 10;
  const digits = unit === "m" ? 2 : 0;
  const display = valueMm === undefined ? "" : (valueMm / divisor).toFixed(digits);

  return (
    <div className="rounded-card border border-line bg-white p-4">
      <div className="flex items-baseline justify-between gap-3">
        <label htmlFor={id} className="text-sm font-medium text-ink">
          {label}
        </label>
        <div className="flex items-baseline gap-1">
          <input
            id={id}
            type="number"
            inputMode="decimal"
            value={display}
            min={minMm / divisor}
            max={maxMm / divisor}
            step={stepMm / divisor}
            onChange={(event) => {
              const next = Number(event.target.value);
              if (Number.isFinite(next) && next > 0) {
                onChange(Math.round(next * divisor));
              }
            }}
            className="w-24 rounded-lg border border-line bg-off-white px-2 py-1 text-right text-sm font-medium tabular-nums text-ink focus:border-brand-green focus:outline-none"
          />
          <span className="text-xs text-ink-subtle">{unit}</span>
        </div>
      </div>

      <input
        type="range"
        aria-label={`${label} slider`}
        value={valueMm ?? minMm}
        min={minMm}
        max={maxMm}
        step={stepMm}
        onChange={(event) => onChange(Number(event.target.value))}
        className="mt-3 w-full accent-[var(--color-brand-green)]"
      />

      {hint ? <p className="mt-2 text-xs text-ink-subtle">{hint}</p> : null}
    </div>
  );
}

/** Simple on/off switch for aquarium and seating. */
export function Toggle({
  checked,
  onChange,
  label,
  description,
}: {
  checked: boolean;
  onChange: (next: boolean) => void;
  label: string;
  description?: string;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      onClick={() => onChange(!checked)}
      className={cn(
        "flex w-full items-center justify-between gap-4 rounded-card border p-4 text-left transition-colors",
        "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-green",
        checked ? "border-brand-green bg-brand-green/5" : "border-line bg-white",
      )}
    >
      <span>
        <span className="block font-medium text-ink">{label}</span>
        {description ? (
          <span className="mt-0.5 block text-sm text-ink-muted">{description}</span>
        ) : null}
      </span>
      <span
        aria-hidden
        className={cn(
          "relative h-6 w-11 shrink-0 rounded-pill transition-colors",
          checked ? "bg-brand-green" : "bg-line",
        )}
      >
        <span
          className={cn(
            "absolute top-0.5 size-5 rounded-full bg-white shadow-sm transition-all",
            checked ? "left-[1.375rem]" : "left-0.5",
          )}
        />
      </span>
    </button>
  );
}
