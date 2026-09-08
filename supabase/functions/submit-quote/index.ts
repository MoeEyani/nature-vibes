// Supabase Edge Function: submit-quote
//
// The only writer of `quote_requests`. The browser posts here; anonymous
// INSERT on the table is revoked by migration 0002.
//
// Deploy:
//   supabase functions deploy submit-quote
//
// Secrets (server-side only — never NEXT_PUBLIC_*):
//   supabase secrets set NATURE_VIBES_NOTIFY_WEBHOOK_URL=...
//   supabase secrets set TURNSTILE_SECRET_KEY=...
// SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are injected by the platform.
//
// This file is a thin shell on purpose: all validation, pricing and rule
// evaluation live in ../../../shared/boundary/handleSubmitQuote.ts, which the
// web app and the test suite import too. There is no second implementation.

import {
  handleSubmitQuote,
  type BoundaryLogEvent,
  type CaptchaOutcome,
  type InsertOutcome,
  type QuoteRow,
  type RateLimitOutcome,
} from "../../../shared/boundary/handleSubmitQuote.ts";
import { buildNotificationPayload } from "../../../shared/boundary/notification.ts";
import type { QuoteRequest } from "../../../shared/configuration/schema.ts";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL") ?? "";
const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
const NOTIFY_WEBHOOK_URL = Deno.env.get("NATURE_VIBES_NOTIFY_WEBHOOK_URL") ?? "";
const TURNSTILE_SECRET_KEY = Deno.env.get("TURNSTILE_SECRET_KEY") ?? "";
const ALLOWED_ORIGINS = (Deno.env.get("ALLOWED_ORIGINS") ?? "*")
  .split(",")
  .map((value) => value.trim())
  .filter(Boolean);

/** Leads accepted per email address per hour. */
const RATE_LIMIT_PER_HOUR = 5;

function corsHeaders(origin: string | null): Record<string, string> {
  const allowAll = ALLOWED_ORIGINS.includes("*");
  const allowed = allowAll
    ? "*"
    : origin && ALLOWED_ORIGINS.includes(origin)
      ? origin
      : ALLOWED_ORIGINS[0] ?? "";
  return {
    "Access-Control-Allow-Origin": allowed,
    "Access-Control-Allow-Headers": "content-type, authorization, apikey",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    Vary: "Origin",
  };
}

function restHeaders(): Record<string, string> {
  return {
    "Content-Type": "application/json",
    apikey: SERVICE_ROLE_KEY,
    Authorization: `Bearer ${SERVICE_ROLE_KEY}`,
  };
}

/** Inserts with the service role. This key never leaves the function. */
async function insertLead(row: QuoteRow): Promise<InsertOutcome> {
  try {
    const response = await fetch(`${SUPABASE_URL}/rest/v1/quote_requests`, {
      method: "POST",
      headers: { ...restHeaders(), Prefer: "return=minimal" },
      body: JSON.stringify([row]),
    });

    if (response.ok) return { ok: true };

    const detail = (await response.text()).slice(0, 500);
    // 23505 is Postgres' unique_violation, i.e. a reused reference.
    if (response.status === 409 || detail.includes("23505")) {
      return { ok: false, reason: "duplicate" };
    }
    return { ok: false, reason: "error", detail: `${response.status} ${detail}` };
  } catch (error) {
    return {
      ok: false,
      reason: "error",
      detail: error instanceof Error ? error.message : String(error),
    };
  }
}

/**
 * Server-side rate limit, counted in the database so it survives cold starts
 * and holds across instances. Fails open: a limiter outage must not stop
 * genuine customers from reaching us.
 */
async function checkRateLimit({ email }: { email: string }): Promise<RateLimitOutcome> {
  try {
    const response = await fetch(`${SUPABASE_URL}/rest/v1/rpc/count_recent_quotes`, {
      method: "POST",
      headers: restHeaders(),
      body: JSON.stringify({ p_email: email, p_within_minutes: 60 }),
    });
    if (!response.ok) return { allowed: true };

    const count = Number(await response.json());
    if (Number.isFinite(count) && count >= RATE_LIMIT_PER_HOUR) {
      return { allowed: false, detail: `${count} in the last hour` };
    }
    return { allowed: true };
  } catch {
    return { allowed: true };
  }
}

/**
 * Cloudflare Turnstile. Only wired up when TURNSTILE_SECRET_KEY is set, so the
 * function works before the account exists — see docs/round2.1-*.md.
 */
async function verifyCaptcha(token: string | undefined): Promise<CaptchaOutcome> {
  if (!TURNSTILE_SECRET_KEY) return { ok: true };
  if (!token) return { ok: false, detail: "missing token" };

  try {
    const body = new FormData();
    body.append("secret", TURNSTILE_SECRET_KEY);
    body.append("response", token);

    const response = await fetch(
      "https://challenges.cloudflare.com/turnstile/v0/siteverify",
      { method: "POST", body },
    );
    const result = (await response.json()) as { success?: boolean };
    return result.success
      ? { ok: true }
      : { ok: false, detail: "turnstile rejected the token" };
  } catch (error) {
    // A verifier outage must not silently let everything through.
    return {
      ok: false,
      detail: error instanceof Error ? error.message : String(error),
    };
  }
}

async function notify(request: QuoteRequest): Promise<void> {
  if (!NOTIFY_WEBHOOK_URL) return;
  await fetch(NOTIFY_WEBHOOK_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(buildNotificationPayload(request)),
  });
}

function log(event: BoundaryLogEvent): void {
  // Structured, and free of contact details by construction.
  console.log(JSON.stringify({ fn: "submit-quote", ...event }));
}

Deno.serve(async (request: Request) => {
  const origin = request.headers.get("origin");
  const cors = corsHeaders(origin);

  if (request.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: cors });
  }
  if (request.method !== "POST") {
    return json({ ok: false, error: { code: "validation", message: "Use POST." } }, 405, cors);
  }
  if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
    log({ type: "insert_failed", detail: "missing service role configuration" });
    return json(
      {
        ok: false,
        error: { code: "server_error", message: "The quote service is not configured." },
      },
      500,
      cors,
    );
  }

  let payload: unknown;
  try {
    payload = await request.json();
  } catch {
    return json(
      { ok: false, error: { code: "validation", message: "Malformed request body." } },
      400,
      cors,
    );
  }

  const result = await handleSubmitQuote(payload, {
    insertLead,
    checkRateLimit,
    verifyCaptcha,
    notify,
    log,
  });

  return json(result.body, result.status, cors);
});

function json(body: unknown, status: number, cors: Record<string, string>): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...cors, "Content-Type": "application/json" },
  });
}
