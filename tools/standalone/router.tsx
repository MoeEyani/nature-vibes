"use client";

/**
 * Minimal hash router used ONLY by the single-file standalone demo build.
 *
 * The standalone bundle has no Next.js runtime, so `next/link` and
 * `next/navigation` are aliased to this file at build time (see build.mjs).
 * Every application component is used unchanged — this is the whole
 * compatibility surface the app needs.
 *
 * Not used by the real app. `npm run dev`, `npm run build` and the GitHub
 * Pages export all use the genuine Next.js router.
 */

import { useCallback, useEffect, useSyncExternalStore, type ReactNode } from "react";

const listeners = new Set<() => void>();

function currentPath(): string {
  if (typeof window === "undefined") return "/";
  const hash = window.location.hash.replace(/^#/, "");
  return hash.startsWith("/") ? hash : "/";
}

function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

if (typeof window !== "undefined") {
  window.addEventListener("hashchange", () => {
    for (const listener of listeners) listener();
  });
}

export function usePathname(): string {
  return useSyncExternalStore(subscribe, currentPath, () => "/");
}

function navigate(href: string, replace: boolean): void {
  const target = `#${href}`;
  if (replace) {
    window.history.replaceState(null, "", target);
    for (const listener of listeners) listener();
  } else {
    window.location.hash = href;
  }
  window.scrollTo({ top: 0 });
}

export function useRouter() {
  const push = useCallback((href: string) => navigate(href, false), []);
  const replace = useCallback((href: string) => navigate(href, true), []);
  const back = useCallback(() => window.history.back(), []);

  return { push, replace, back, forward: () => window.history.forward(), refresh: () => {}, prefetch: () => {} };
}

export function redirect(href: string): never {
  if (typeof window !== "undefined") navigate(href, true);
  throw new Error(`redirect: ${href}`);
}

export function notFound(): never {
  throw new Error("not found");
}

export function useSearchParams(): URLSearchParams {
  return new URLSearchParams();
}

type LinkProps = {
  href: string;
  children: ReactNode;
  className?: string;
  [key: string]: unknown;
};

/** Drop-in for `next/link`, rewriting app paths onto the hash route. */
export default function Link({ href, children, className, ...rest }: LinkProps) {
  return (
    <a
      href={`#${href}`}
      className={className}
      onClick={() => window.scrollTo({ top: 0 })}
      {...rest}
    >
      {children}
    </a>
  );
}

/** Scroll to the top whenever the route changes, as Next.js does. */
export function useScrollReset(): void {
  const pathname = usePathname();
  useEffect(() => {
    window.scrollTo({ top: 0 });
  }, [pathname]);
}
