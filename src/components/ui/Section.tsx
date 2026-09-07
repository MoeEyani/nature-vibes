import type { ReactNode } from "react";
import { cn } from "./cn";

/** A labelled group of options inside a wizard step. */
export function Section({
  title,
  description,
  action,
  children,
  className,
}: {
  title: string;
  description?: string;
  action?: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  return (
    <section className={cn("mt-8 first:mt-0", className)}>
      <div className="mb-3 flex items-end justify-between gap-4">
        <div>
          <h3 className="eyebrow text-ink-muted">{title}</h3>
          {description ? (
            <p className="mt-1 text-sm text-ink-muted">{description}</p>
          ) : null}
        </div>
        {action}
      </div>
      {children}
    </section>
  );
}

/** Responsive option grid. Desktop-first, collapses cleanly on mobile. */
export function OptionGrid({
  columns = 2,
  children,
}: {
  columns?: 1 | 2 | 3 | 4;
  children: ReactNode;
}) {
  const cols = {
    1: "grid-cols-1",
    2: "grid-cols-1 sm:grid-cols-2",
    3: "grid-cols-1 sm:grid-cols-2 lg:grid-cols-3",
    4: "grid-cols-2 lg:grid-cols-4",
  }[columns];

  return <div className={cn("grid gap-3", cols)} role="group">{children}</div>;
}
