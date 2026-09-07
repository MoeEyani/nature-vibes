/**
 * Basic anti-spam for the public quote form.
 *
 * Two cheap client-side signals that stop naive bots without adding friction
 * for a real customer. Neither is a security control: a determined submitter
 * defeats both. The real defence belongs at the remote boundary — see
 * `describeUpgradePath` and docs/round2-productionization.md.
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

/**
 * Extension point. When abuse becomes real, add one of these in front of the
 * insert rather than hardening the client:
 *
 *  - a CAPTCHA (Cloudflare Turnstile / hCaptcha) verified server-side;
 *  - a Supabase edge function that rate-limits by IP before inserting;
 *  - a per-email/per-hour rate limit enforced in Postgres.
 */
export const ANTI_SPAM_UPGRADE_PATH =
  "Verify a Turnstile/hCaptcha token in an edge function, or rate-limit by IP " +
  "before the insert. The client-side honeypot and timing check are a first " +
  "filter only.";
