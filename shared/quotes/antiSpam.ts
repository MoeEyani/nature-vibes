/**
 * Client-side first filter for the public quote form.
 *
 * These two signals stop naive bots without adding friction for a real
 * customer. **Neither is a security control** — both run in the browser, so
 * anyone posting directly to the endpoint bypasses them entirely. They are a
 * convenience filter, and nothing in the UI or docs should describe them as
 * more than that.
 *
 * The real defences live at the trusted boundary, in the Edge Function:
 * Cloudflare Turnstile verification against a server-held secret, and a
 * database-backed rate limit. See supabase/functions/submit-quote/index.ts.
 */

/** Name of the hidden field a human never fills in. */
export const HONEYPOT_FIELD = "nv_company_website";

/** A genuine customer takes longer than this to complete the form. */
export const MIN_FORM_SECONDS = 3;

export type SpamCheckInput = {
  honeypotValue: string;
  /** Milliseconds since the form was first rendered. */
  elapsedMs: number;
};

export type SpamCheckResult = { spam: false } | { spam: true; reason: string };

export function checkForSpam({
  honeypotValue,
  elapsedMs,
}: SpamCheckInput): SpamCheckResult {
  if (honeypotValue.trim() !== "") {
    return { spam: true, reason: "honeypot filled" };
  }
  if (elapsedMs < MIN_FORM_SECONDS * 1000) {
    return { spam: true, reason: "submitted too quickly" };
  }
  return { spam: false };
}
