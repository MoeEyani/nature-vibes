"use client";

import { useEffect, useRef, useState } from "react";
import { TURNSTILE_SITE_KEY } from "@/constants/appConfig";

/**
 * Cloudflare Turnstile widget.
 *
 * Renders only when a site key is configured, so the app works unchanged
 * before a Cloudflare account exists — the Edge Function likewise skips
 * verification until its secret key is set. Enabling it is two environment
 * variables and no code change.
 *
 * The token is passed to the trusted boundary, which verifies it against the
 * secret key. Nothing here is a control by itself.
 */

type TurnstileApi = {
  render: (
    el: HTMLElement,
    options: {
      sitekey: string;
      callback: (token: string) => void;
      "error-callback"?: () => void;
      "expired-callback"?: () => void;
    },
  ) => string;
  reset: (widgetId?: string) => void;
};

declare global {
  interface Window {
    turnstile?: TurnstileApi;
  }
}

const SCRIPT_SRC =
  "https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit";

export function useTurnstileEnabled(): boolean {
  return Boolean(TURNSTILE_SITE_KEY);
}

export function TurnstileField({
  onToken,
}: {
  onToken: (token: string | undefined) => void;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const widgetIdRef = useRef<string | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    if (!TURNSTILE_SITE_KEY) return;

    let cancelled = false;

    function render() {
      if (cancelled || !containerRef.current || !window.turnstile) return;
      if (widgetIdRef.current !== null) return;
      widgetIdRef.current = window.turnstile.render(containerRef.current, {
        sitekey: TURNSTILE_SITE_KEY,
        callback: (token) => onToken(token),
        "error-callback": () => {
          setFailed(true);
          onToken(undefined);
        },
        // A stale token is worse than none: the boundary would reject it.
        "expired-callback": () => onToken(undefined),
      });
    }

    if (window.turnstile) {
      render();
      return () => {
        cancelled = true;
      };
    }

    const existing = document.querySelector<HTMLScriptElement>(
      `script[src="${SCRIPT_SRC}"]`,
    );
    const script = existing ?? document.createElement("script");
    if (!existing) {
      script.src = SCRIPT_SRC;
      script.async = true;
      script.defer = true;
      document.head.appendChild(script);
    }
    script.addEventListener("load", render);
    script.addEventListener("error", () => setFailed(true));

    return () => {
      cancelled = true;
      script.removeEventListener("load", render);
    };
  }, [onToken]);

  if (!TURNSTILE_SITE_KEY) return null;

  return (
    <div>
      <div ref={containerRef} />
      {failed ? (
        <p className="mt-2 text-xs text-danger">
          The verification widget could not load. Reload the page and try again.
        </p>
      ) : null}
    </div>
  );
}
