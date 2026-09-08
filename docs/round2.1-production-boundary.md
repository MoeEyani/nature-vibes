---
project: Nature Vibes
document_type: Round 2.1 — Production Boundary Hardening
version: 1.0
date: 2026-09-08
status: Delivered (code complete; Supabase deployment pending credentials)
---

# Round 2.1 — Production Boundary Hardening

Round 2 gave the quote flow a real transport. It still had one structural
weakness:

> Production quote creation went straight from the browser to Supabase with the
> anon key. Client-side validation could be bypassed, and the notification
> webhook was public client configuration.

Round 2.1 moves creation and notification behind a trusted server boundary.
No rewrite, no redesign, no new product data.

---

## 1. What the flow looks like now

```
Browser
  │  POST /functions/v1/submit-quote      (anon key — invoke only)
  ▼
Supabase Edge Function: submit-quote
  │  shared domain validation, pricing, rules
  │  INSERT with the service role
  │  team notification (server secret)
  ▼
{ ok, reference, submittedAt, status }    ← no personal data
```

The browser can no longer write to `quote_requests` at all. Migration 0002
drops the anon INSERT policy and revokes the grant, so this is not a
convention — it is enforced by the database.

---

## 2. One implementation, two runtimes

The hardest constraint in this round was reuse: the boundary needs the pricing
engine and the rules engine, which lived in the Next.js app.

**What was done.** Every pure module moved to `shared/` — a runtime-neutral
folder with no React, Next or browser dependency:

```
shared/
  types/        catalog item model
  catalog/      products and services
  seed/         default configuration
  configuration/ schema, derive, normalize, environmentParam
  aquarium/     volume estimates
  pricing/      calculatePrice
  rules/        rule set and evaluator
  quotes/       repository contract, client-side anti-spam
  lib/          id generation
  boundary/     handleSubmitQuote, publicSubmission, catalogIntegrity, notification
```

Imports inside `shared/` are relative **with explicit `.ts` extensions**, which
Deno requires and which TypeScript, Next.js and Vitest all accept. This was
verified before the move rather than assumed. The web app reaches the same
files through a `@shared/*` alias, so nothing in `src/` changed shape.

`zod` is the one external dependency; the function's `deno.json` maps it to
`npm:zod@^4.1.5`.

**The result:** there is exactly one pricing engine and one rule set. A test
asserts the Edge Function contains no second copy.

### The handler is pure

`shared/boundary/handleSubmitQuote.ts` takes a payload and a set of injected
dependencies (`insertLead`, `verifyCaptcha`, `checkRateLimit`, `notify`, `now`,
`createReference`, `log`) and returns `{ status, body }`.

`supabase/functions/submit-quote/index.ts` is a thin Deno shell that supplies
the real implementations and maps the result to HTTP.

That split is what makes the trusted boundary testable here: 23 tests exercise
it directly, with no Deno and no Postgres. **Deno is not available in this
environment, so the function has not been executed as deployed** — the logic it
runs is covered, the shell is not.

---

## 3. The client can no longer assert anything it shouldn't

Round 2 sent a finished `QuoteRequest` — including a price and a validation
result — and the boundary re-checked them. Round 2.1 does not accept them at
all:

```ts
type PublicQuoteSubmission = {
  schemaVersion: number;
  reference?: string;          // shape-checked; generated when absent
  customer: QuoteCustomer;
  configuration: DesignConfiguration;
  selectedServiceIds: string[];
  source: "web-configurator";
  antiSpam?: { turnstileToken?: string };
};
```

Anything else in the body is ignored. The boundary produces the price, the
validation snapshot, the timestamp and the status itself. Tests submit a
payload carrying `estimatedTotal: 1` and `validation.status: "ok"` and assert
that neither reaches the database.

### Order of checks

1. payload shape (Zod) — reject 400;
2. captcha — reject 403;
3. rate limit — reject 429;
4. **unknown catalog / service ids — reject 400**;
5. normalise the configuration;
6. rules — `incompatible` rejects 400, `review_required` passes;
7. price and validation snapshot, in trusted code;
8. insert — duplicate 409, failure 500;
9. notify, only after a confirmed insert;
10. return `{ ok, reference, submittedAt, status: "new" }`.

**Step 4 runs against the payload as submitted, before normalisation.** This
was a real finding while writing the tests: `normalizeConfiguration` silently
strips unknown ids from list fields, and the rules engine cannot see an
invented id either, because unknown lookups return `undefined` and get
filtered away. Quietly cleaning a hostile payload is worse than refusing it,
so the boundary refuses it.

---

## 4. Database

`supabase/migrations/0002_trusted_boundary.sql`:

- drops the `"anon can create a new lead"` policy from 0001;
- `revoke insert`, `revoke all`, `revoke select` on `quote_requests` from anon;
- adds `count_recent_quotes(email, minutes)`, granted to `service_role` only,
  for the rate limit;
- keeps `get_quote_summary()` granted to anon, because the success screen still
  needs to confirm a reference after a reload — it returns confirmation fields
  and the configuration, never contact details.

The service role bypasses RLS by design, so the function needs no policy.
`authenticated` keeps its read policy for the future admin app.

The migration ends with the exact `curl` commands to verify the lock-down.
`tests/securityPosture.test.ts` asserts the revokes are present and that no new
anon INSERT policy has been introduced — a guard against silently reopening
the door this round closed.

---

## 5. Notifications

`NEXT_PUBLIC_NOTIFY_WEBHOOK_URL` is **gone**. Anything bundled into the browser
is public, so a private team channel could not live there.

It is now `NATURE_VIBES_NOTIFY_WEBHOOK_URL`, a Supabase secret read only inside
the function. The sequence is: validate → insert → *then* notify. Notification
runs inside a `try/catch` and its failure is logged, never surfaced, and never
allowed to affect the stored lead. A test asserts a throwing notifier still
yields 201.

The payload carries reference, timestamp, customer **name**, city, preferred
contact, estimated total, validation status and services — deliberately **not**
email, phone or the message body. Those live in the database behind
authentication. A test asserts the payload contains none of them, and that the
operational log contains none either.

---

## 6. Anti-spam

| Layer | Where | What it is |
| --- | --- | --- |
| Honeypot + minimum form time | browser | A first filter. **Not a control** — anyone posting directly bypasses it. The code and the docs both say so. |
| Cloudflare Turnstile | token in browser, **verified in the function** against a secret | The real check |
| Rate limit | function, counted in Postgres | 5 leads per email per hour |

Turnstile is wired end to end but inert until credentials exist: with no
`NEXT_PUBLIC_TURNSTILE_SITE_KEY` no widget renders, and with no
`TURNSTILE_SECRET_KEY` the boundary skips verification. Enabling it is two
variables and no code change.

The rate limiter **fails open**: if the counting RPC is unavailable, genuine
customers still get through. That is a deliberate trade — a limiter outage
should not cost leads. If abuse becomes real, the next step is to revoke anon
`EXECUTE` on the function and rate-limit by IP at the edge.

---

## 7. Failure behaviour

Round 2's UX is preserved, with explicit handling per status:

| From the boundary | Shown as | Retry offered |
| --- | --- | --- |
| 400 validation / configuration | the boundary's own message | no |
| 403 captcha | "could not verify… reload and try again" | yes (token cleared) |
| 409 duplicate | "already been submitted" | yes |
| 429 rate limit | "wait a few minutes" | yes |
| 5xx | "temporarily unavailable" | yes |
| timeout / network | "took too long" / "could not reach" | yes |

Success is still rendered only after a confirmed write. Failures keep every
field the customer typed. Demo mode still says browser-only. A production build
without credentials still falls back to demo rather than claiming receipt.

Verified in a browser against a stub that fails the first attempt and accepts
the retry, with the endpoints the browser actually called recorded: only
`/functions/v1/submit-quote` and `/rest/v1/rpc/get_quote_summary`.

---

## 8. Demo mode runs the same boundary

`LocalDemoQuoteRepository` now calls `handleSubmitQuote` with localStorage in
the role Postgres plays. Demo is therefore a faithful rehearsal of production
validation rather than a laxer parallel path, and every demo test exercises the
trusted boundary.

**GitHub Pages is unaffected.** It builds in demo mode, has no Supabase
credentials, and its quote flow behaves exactly as before — re-verified in a
browser after this round.

---

## 9. Deployment

### Environment variables

Browser-visible (`NEXT_PUBLIC_*`, all safe to publish):

| Variable | Purpose |
| --- | --- |
| `NEXT_PUBLIC_APP_MODE` | `demo` (default) or `production` |
| `NEXT_PUBLIC_SUPABASE_URL` | project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | anon key — can now only *invoke*, not insert |
| `NEXT_PUBLIC_TURNSTILE_SITE_KEY` | Turnstile site key (optional) |

Supabase secrets (never `NEXT_PUBLIC_*`):

| Secret | Purpose |
| --- | --- |
| `NATURE_VIBES_NOTIFY_WEBHOOK_URL` | where new-lead notifications go |
| `TURNSTILE_SECRET_KEY` | verifies the Turnstile token |
| `ALLOWED_ORIGINS` | comma-separated CORS allow-list (defaults to `*`) |
| `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY` | injected by the platform |

### Order of operations

```bash
# 1. Migrations, in order
supabase db push          # or paste 0001 then 0002 into the SQL editor

# 2. Deploy the function
supabase functions deploy submit-quote

# 3. Server secrets
supabase secrets set NATURE_VIBES_NOTIFY_WEBHOOK_URL="https://hooks.slack.com/..."
supabase secrets set ALLOWED_ORIGINS="https://moeeyani.github.io"
# optional:
supabase secrets set TURNSTILE_SECRET_KEY="0x..."

# 4. Build the frontend in production mode
NEXT_PUBLIC_APP_MODE=production \
NEXT_PUBLIC_SUPABASE_URL=https://<project>.supabase.co \
NEXT_PUBLIC_SUPABASE_ANON_KEY=<anon-key> \
npm run build:static
```

### Verifying the lock-down

With the anon key, all three must hold:

```bash
# 1. Direct insert must FAIL
curl -X POST "$SUPABASE_URL/rest/v1/quote_requests" \
  -H "apikey: $ANON_KEY" -H "Authorization: Bearer $ANON_KEY" \
  -H "Content-Type: application/json" -d '[{"reference":"NV-TEST-0001"}]'
# -> 401/403

# 2. Direct read must return nothing
curl "$SUPABASE_URL/rest/v1/quote_requests?select=*" \
  -H "apikey: $ANON_KEY" -H "Authorization: Bearer $ANON_KEY"
# -> []

# 3. The function must accept a valid submission
curl -X POST "$SUPABASE_URL/functions/v1/submit-quote" \
  -H "apikey: $ANON_KEY" -H "Content-Type: application/json" \
  -d @a-valid-submission.json
# -> 201 {"ok":true,"reference":"NV-....","submittedAt":"...","status":"new"}
```

Policy inventory afterwards:

```sql
select policyname, roles, cmd from pg_policies where tablename = 'quote_requests';
-- only "authenticated can read leads" (SELECT, authenticated)
```

### Keeping GitHub Pages in demo mode

Do nothing. `npm run deploy:pages` builds without Supabase variables, so
`APP_MODE` resolves to `demo`. Never set production variables in that build.

---

## 10. Tests

131 total, up from 94. Every earlier test still passes.

New in this round:

- the remote repository posts to the Edge Function and **never** to
  `/rest/v1/quote_requests`;
- the request body contains no price and no validation result;
- 400 / 403 / 409 / 429 / 5xx / timeout each map to the right code and
  retryability, and the boundary's own message reaches the customer;
- `ok: false` on a 200 is not treated as success;
- an injected price and validation result are ignored; the stored values are
  recomputed;
- status and timestamp are stamped by the boundary, not the client;
- invented catalog ids are rejected — in scalar fields *and* in list fields
  that normalisation would otherwise strip;
- unknown service ids are rejected;
- blocking configurations are rejected; review-required ones are accepted;
- captcha failure returns 403 and stores nothing; the submitted token reaches
  the verifier;
- rate-limit failure returns 429 and stores nothing;
- notification fires only after a confirmed insert, and a throwing notifier
  still yields 201;
- the response, the notification payload and the operational log contain no
  contact details;
- migration 0002 revokes anon INSERT and SELECT, adds no new anon INSERT
  policy, and keeps the summary RPC;
- the function reads only server-side secrets and reuses the shared boundary.

---

## 11. What still needs credentials

| Item | Status |
| --- | --- |
| Edge Function code | complete, not deployed (no Supabase project) |
| Migrations 0001 + 0002 | written, not run |
| Turnstile | wired end to end, inert until keys exist |
| Notification webhook | wired, inert until the secret is set |
| Rate limit | implemented against `count_recent_quotes` |

Nothing here blocks Round 3. The demo remains live and honest in the meantime.
