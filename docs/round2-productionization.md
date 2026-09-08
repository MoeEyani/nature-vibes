---
project: Nature Vibes
document_type: Round 2 — Production Lead Pipeline
version: 1.0
date: 2026-09-07
status: Delivered — partly superseded by Round 2.1
---

# Round 2 — Production Lead Pipeline

> **Superseded in places by Round 2.1.** Quote creation no longer goes from the
> browser to Supabase directly: it goes through the `submit-quote` Edge
> Function, anonymous INSERT is revoked, and the notification webhook is a
> server secret rather than a `NEXT_PUBLIC_*` variable. Where this document and
> [`round2.1-production-boundary.md`](round2.1-production-boundary.md)
> disagree, 2.1 is current.

Round 1 built a working configurator whose quote flow was a demo: the UI said
“Your request is in” while the payload went into `localStorage`. Round 2 makes
that flow truthful and production-capable, and fixes the state inconsistencies
around services and persistence.

No rewrite, no redesign, no new mockups. The architecture from Round 1 —
catalog-driven options, one `DesignConfiguration`, Zustand, Zod, the pricing
and rules engines, the asset-key 3D layer — is unchanged.

---

## 1. The P0 fix: quote requests now have a real transport

### The abstraction

`src/domain/quotes/` defines the boundary the UI talks to:

```ts
interface QuoteRepository {
  readonly kind: "local" | "remote";
  submit(request: QuoteRequest): Promise<QuoteSubmissionResult>;
  getByReference(reference: string): Promise<QuoteRecord | null>;
}
```

Two implementations:

| Implementation | Used when | Writes to |
| --- | --- | --- |
| `LocalDemoQuoteRepository` | demo mode | the visitor's own browser |
| `RemoteQuoteRepository` | production mode | Supabase/Postgres over PostgREST |

`getQuoteRepository()` picks one from the build's configuration. No component
imports a concrete repository, so demo and production differ by wiring only.

`setQuoteRepository()` exists as a test seam.

### Why `fetch` rather than `@supabase/supabase-js`

The app is a static export. Plain `fetch` against PostgREST keeps the bundle
small, keeps the app deployable to any static host, and makes the transport
trivially mockable — the remote repository is unit-tested against injected
`fetch` implementations covering success, 503, 401, a thrown network error and
missing credentials. Swapping in the official client later changes one file.

### Submission behaviour

Production:

1. validate the customer form (Zod, client-side);
2. evaluate the configuration; only `incompatible` blocks;
3. build one immutable `QuoteRequest` snapshot;
4. `submit()` it to the repository;
5. **await a confirmed write**;
6. store the returned reference;
7. navigate to `/design/success?ref=…`.

Success is rendered only after step 5 resolves `ok: true`. On failure the
customer stays on the quote screen, sees a human-readable message, keeps
everything they typed, and can press the button again. Verified in a browser
against a backend that returns 503 on the first attempt and accepts on the
second.

Demo: the same pipeline, a local repository, and copy that says what actually
happened — “saved in this browser only”, “not sent to Nature Vibes”, with the
CTA reading “Create demo request”.

### A deliberate deviation from the brief

The brief sketched `getByReference(reference): Promise<QuoteRequest | null>`.
Returning the whole request would make a design reference a key to somebody's
name, email and phone. References are 8 characters from a 32-symbol alphabet —
enough to deter guessing, not enough to protect personal data.

So `getByReference` returns a `QuoteRecord`: reference, timestamp, status,
estimated total, validation status, selected services and the configuration
snapshot — no contact details. That is everything the success screen needs. In
the database this is enforced by `get_quote_summary()`; anon has no `SELECT`
on the table at all. A test asserts the returned record contains no email
address.

---

## 2. Services are now a single source of truth

**The bug.** The review step toggled `pricingContext.includeInstallation` /
`includeMaintenance`, while the quote form kept an independent
`additionalServices` array defaulting to `["SVC-DELIVERY"]`. They shared no
state. A customer could be quoted a total that included installation while
submitting a request that did not ask for it, or the reverse.

**The fix.** One list, `selectedServiceIds`, living in the session:

```ts
type DesignSession = {
  schemaVersion: 2;
  configuration: DesignConfiguration;
  selectedServiceIds: string[];
  reference: string | null;
};
```

- `src/data/catalog/services.ts` is the service catalog, with the same shape
  discipline as the product catalog: stable ids, placeholder pricing status,
  and a `rateOfProductSubtotal` / `onRequest` distinction.
- `calculatePrice(config, { selectedServiceIds })` derives the service lines.
  `normalizeServiceIds` de-duplicates, which is what stops a service being
  charged twice.
- `ServicesPicker` is **one component**, rendered by both the review step and
  the quote form. They cannot drift because there is one control and one piece
  of state behind it.
- The quote snapshot submits exactly `selectedServiceIds`, and the boundary
  validation re-prices from that same list.

Verified in a browser: toggling maintenance on the review step changes the
total, and the quote form opens with it already checked and the same total.

---

## 3. Persistence: v2 with migration

New keys:

```
nv.configurator.session.v2     the working session (was: draft.v1)
nv.configurator.designs.v2     saved designs
nv.configurator.quotes.v2      demo quote requests
```

`src/lib/persistence.ts` owns loading, and migrates on the way through:

1. read `session.v2`; if valid, use it;
2. otherwise read the v1 draft, wrap it in a session with the default service
   selection, write it to v2, and use it;
3. otherwise start from defaults.

Saved designs migrate the same way: v1 records lack `selectedServiceIds`, and
the Zod default supplies an empty list. **The v1 keys are read but never
written or deleted**, so nothing is destroyed and an older build still finds
its data.

Everything read from storage is validated and then re-normalised through the
domain invariants, so corrupt or hand-edited data degrades to defaults instead
of crashing. There is a test for each of those paths.

---

## 4. Success is reload-safe

The route is now `/design/success?ref=NV-XXXX-XXXX`. On load the page:

- uses the in-session quote if the reference matches;
- otherwise asks the repository for the record (local read in demo, the
  `get_quote_summary` RPC in production);
- shows a loading state while it does;
- shows an explicit not-found state for an unknown reference — never a false
  confirmation.

Verified in both modes, including a production reload after clearing the local
copy, which restores the record from the backend.

---

## 5. Database

`supabase/migrations/0001_quote_requests.sql` creates `public.quote_requests`
with the fields the brief listed, a `quote_status` enum
(`new → contacted → qualified → quoted → won → lost`), JSONB snapshots, and a
unique constraint on `reference`.

Security is in the database, because the browser only holds the anon key:

- **anon may INSERT**, and only with `status = 'new'` and `consent = true`;
- **anon may not SELECT** the table;
- reads go through `get_quote_summary()` (`security definer`), which returns
  no personal data;
- `authenticated` may read, for the future admin app;
- CHECK constraints enforce the reference format, field lengths, a valid email
  shape, a permitted contact method, recorded consent, and that
  `customer_city` is never the literal string `other`.

Only `new` is used by the customer app today; the rest of the enum exists so
the admin workflow has somewhere to go.

---

## 6. Security & privacy

| Concern | How it is handled |
| --- | --- |
| Client-calculated totals | `validateQuoteRequest` **recomputes** the estimate from the configuration and rejects a mismatch beyond 1 SAR. The stored total is the recomputed one, never the one that arrived. |
| Unbuildable designs | The same boundary re-runs the rules engine and rejects anything with a blocking incompatibility. |
| Secrets in the browser | Only `NEXT_PUBLIC_*` values are used, and the anon key is designed to be public. The service-role key is never referenced. |
| Personal data exposure | See the `QuoteRecord` deviation above; anon cannot read the table. |
| Consent | A required checkbox, stored on the row, and enforced by a CHECK constraint and the RLS policy. |
| Anti-spam | A honeypot field plus a minimum time-on-form. Both are a first filter, not a control — `src/domain/quotes/antiSpam.ts` and the SQL file document the upgrade path (Turnstile/hCaptcha verified in an edge function, or a rate limit). |

The boundary validation is written as a pure function precisely so it can be
lifted into an edge function or route handler unchanged when one exists.

---

## 7. Notifications

`src/domain/quotes/notifications.ts` posts a compact summary to
`NEXT_PUBLIC_NOTIFY_WEBHOOK_URL` when a lead is created. It is a no-op when the
variable is unset, which is the default.

The database row is the source of truth: `notifyTeam` is fired with `void`,
never awaited, and never throws, so a failed notification cannot lose a lead.
The payload deliberately omits the message body.

Anything requiring a secret (SMTP credentials, a Slack bot token) must be
called server-side — point the webhook at an edge function rather than putting
a secret in a `NEXT_PUBLIC_*` variable.

---

## 8. Small UX fixes

- **Home environment cards** link to `/design/location?environment=ENV-…` and
  the location step applies it after hydration. `resolveEnvironmentParam`
  refuses anything that is not an *active* environment, so a hand-edited URL
  cannot push the configuration into an invalid state (`ENV-COMMERCIAL` is
  `future`, and is rejected).
- **City “Other”** reveals a required free-text field. The schema rejects the
  literal word “other”, and so does a database CHECK constraint.
- **Copy** now matches the mode everywhere: the quote banner, the CTA, the
  submit button, the footnote and the success screen all read from `APP_MODE`.

---

## 9. Environment variables

See `.env.example`. Summary:

| Variable | Required | Purpose |
| --- | --- | --- |
| `NEXT_PUBLIC_APP_MODE` | no (defaults to `demo`) | `demo` or `production` |
| `NEXT_PUBLIC_SUPABASE_URL` | for production | Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | for production | Supabase anon key (public by design) |
| `NEXT_PUBLIC_NOTIFY_WEBHOOK_URL` | no | Team notification endpoint |
| `NEXT_OUTPUT_EXPORT` | for static builds | `1` to emit `out/` |
| `NEXT_PUBLIC_BASE_PATH` | for GitHub Pages | e.g. `/nature-vibes` |

**Production mode is only honoured when the two Supabase values are present.**
Otherwise the app falls back to demo and says so — a build that claimed
production without a backend would tell customers their request had been
received when nothing could have received it.

---

## 10. Deployment

### Demo (unchanged)

The existing GitHub Pages static build still works and stays in demo mode.
Nothing in this round breaks it.

```bash
npm run build:pages   # out/ with base path, demo mode
```

### Production

The app is still fully static, so the simplest production path is the same
static build with production env vars, hosted anywhere — including GitHub
Pages — calling Supabase from the browser under the RLS policies above:

```bash
NEXT_PUBLIC_APP_MODE=production \
NEXT_PUBLIC_SUPABASE_URL=https://<project>.supabase.co \
NEXT_PUBLIC_SUPABASE_ANON_KEY=<anon-key> \
npm run build:static
```

Setup order:

1. create the Supabase project;
2. run `supabase/migrations/0001_quote_requests.sql`;
3. confirm RLS: anon can insert, anon cannot select;
4. build with the variables above and deploy;
5. submit one test lead and confirm the row exists.

**Move to Vercel (or another Next.js host) when** you add server-side API
routes — which is the right moment to relocate the boundary validation server
-side, put a CAPTCHA in front of the insert, revoke anon INSERT in favour of a
service-role edge function, or send email with a secret. None of that is
needed for the first leads.

---

## 11. Tests

94 tests, up from 51. Everything from Round 1 still passes.

New coverage:

- demo submit succeeds locally and reads back;
- a failing repository leaves `lastQuote` null, sets no reference, and writes
  nothing — no false success;
- remote repository against injected `fetch`: 201, 503 (retryable), 401
  (not retryable), thrown error, missing credentials;
- success restoration by reference after the in-memory quote is cleared;
- the record returned by reference contains no email address;
- pricing services and submitted services cannot diverge;
- a service is never charged twice; unknown services are ignored;
- service selection survives a refresh and a saved-design reload;
- saved estimate matches saved services;
- v1 draft and v1 saved designs migrate to v2, non-destructively;
- corrupt storage degrades to defaults;
- incompatible design blocks submission; review-required design submits;
- tampered totals are rejected at the boundary;
- environment preselection resolves valid ids and refuses everything else;
- `Other` city is rejected until real text is supplied;
- consent is required;
- the notification payload omits the message body.

Browser-verified end to end in both modes.
