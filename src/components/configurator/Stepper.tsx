"use client";

import Link from "next/link";
import { useEffect, useRef } from "react";
import type { StepDefinition, StepId } from "@/constants/steps";
import { cn } from "@/components/ui/cn";

/**
 * The wizard progress rail. Visited steps become links so the customer can
 * jump back to any earlier decision without losing state.
 */
export function Stepper({
  steps,
  currentId,
  visited,
}: {
  steps: StepDefinition[];
  currentId: StepId;
  visited: string[];
}) {
  const currentIndex = steps.findIndex((step) => step.id === currentId);
  const currentRef = useRef<HTMLLIElement>(null);

  // With fourteen steps the rail scrolls; keep the active step in view.
  useEffect(() => {
    currentRef.current?.scrollIntoView({ block: "nearest", inline: "center" });
  }, [currentId]);

  return (
    <nav aria-label="Design steps" className="w-full">
      <ol className="nv-scroll flex items-center gap-0 overflow-x-auto pb-1">
        {steps.map((step, index) => {
          const isCurrent = step.id === currentId;
          const isDone = index < currentIndex;
          const reachable = isDone || visited.includes(step.id);

          const content = (
            <span className="flex flex-col items-center gap-1.5">
              <span
                className={cn(
                  "flex size-7 items-center justify-center rounded-full border text-xs font-semibold transition-colors",
                  isCurrent
                    ? "border-brand-green bg-brand-green text-cream"
                    : isDone
                      ? "border-brand-green/40 bg-brand-green/10 text-brand-green"
                      : "border-line bg-white text-ink-subtle",
                )}
              >
                {isDone ? (
                  <svg viewBox="0 0 20 20" className="size-3.5" fill="none" stroke="currentColor" strokeWidth="3">
                    <path d="M4 10.5 8 14.5 16 6" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                ) : (
                  index + 1
                )}
              </span>
              <span
                className={cn(
                  "whitespace-nowrap text-[11px]",
                  isCurrent ? "font-semibold text-ink" : "text-ink-subtle",
                )}
              >
                {step.label}
              </span>
            </span>
          );

          return (
            <li
              key={step.id}
              ref={isCurrent ? currentRef : undefined}
              className="flex shrink-0 items-center"
            >
              {reachable && !isCurrent ? (
                <Link
                  href={`/design/${step.id}`}
                  aria-current={isCurrent ? "step" : undefined}
                  className="rounded-lg px-2 py-1 transition-opacity hover:opacity-80 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-green"
                >
                  {content}
                </Link>
              ) : (
                <span
                  aria-current={isCurrent ? "step" : undefined}
                  className="px-2 py-1"
                >
                  {content}
                </span>
              )}

              {index < steps.length - 1 ? (
                <span
                  aria-hidden
                  className={cn(
                    "mb-5 h-px w-5 shrink-0 sm:w-8",
                    index < currentIndex ? "bg-brand-green/40" : "bg-line",
                  )}
                />
              ) : null}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
