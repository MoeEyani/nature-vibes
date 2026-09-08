/**
 * Runtime configuration.
 *
 * The app ships in one of two modes:
 *
 * - `demo`       — quote requests are stored in the visitor's own browser and
 *                  are never sent anywhere. The UI says so, in those words.
 * - `production` — quote requests are written to the remote backend, and the
 *                  success screen appears only after that write is confirmed.
 *
 * `process.env.NEXT_PUBLIC_*` must be referenced literally so Next.js can
 * inline the values at build time; do not rewrite these as dynamic lookups.
 */

export type AppMode = "demo" | "production";

const RAW_MODE = process.env.NEXT_PUBLIC_APP_MODE;

export const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
export const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "";

/** True when both Supabase values are present. */
export const REMOTE_CONFIGURED = Boolean(SUPABASE_URL && SUPABASE_ANON_KEY);

/**
 * Production is only honoured when the backend is actually configured.
 *
 * Falling back to demo is deliberate: a build that claims to be production
 * without credentials would tell customers their request had been received
 * when nothing could possibly have received it.
 */
export const APP_MODE: AppMode =
  RAW_MODE === "production" && REMOTE_CONFIGURED ? "production" : "demo";

/** True when production was asked for but cannot be honoured. */
export const PRODUCTION_MISCONFIGURED =
  RAW_MODE === "production" && !REMOTE_CONFIGURED;

export const IS_DEMO = APP_MODE === "demo";
export const IS_PRODUCTION = APP_MODE === "production";

/** Identifies which client produced a quote request. */
export const QUOTE_SOURCE = "web-configurator";

/**
 * Cloudflare Turnstile site key. Public by design — the *secret* key lives
 * only in Supabase secrets, and verification happens in the Edge Function.
 * When unset, no widget renders and the boundary skips captcha verification.
 */
export const TURNSTILE_SITE_KEY =
  process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY ?? "";

/**
 * Team notification is server-side as of Round 2.1. The webhook URL is a
 * Supabase secret (NATURE_VIBES_NOTIFY_WEBHOOK_URL), never a NEXT_PUBLIC_*
 * value, because anything bundled into the browser is public.
 */
