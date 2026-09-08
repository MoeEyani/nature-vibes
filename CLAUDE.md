# Nature Vibes Configurator — working notes

## ⚠️ The live site serves from the `gh-pages` branch

**https://moeeyani.github.io/nature-vibes/ is served from the `gh-pages`
branch, and nothing rebuilds it automatically.** GitHub Actions cannot start
jobs on this account, so Pages uses "Deploy from a branch".

Consequence: **the moment source changes, the live site is stale.** Visitors
keep seeing the previous version until someone republishes.

```bash
npm run pages:check     # is the live site serving current source? exit 1 = stale
npm run deploy:pages    # build and force-push out/ to gh-pages
```

**After any change that affects the built app, run `deploy:pages`.** Treat it
as part of finishing the work, not an optional extra. Run `pages:check` before
telling anyone the site is up to date — do not answer that from memory.

Why a plain `git diff` is useless here: Next.js embeds a random build ID in
every page and in one asset directory name, so no two builds are ever
byte-identical. `pages:check` compares the content-hashed files under
`_next/static/chunks` and the HTML with the build ID normalised away.

## Modes

The app builds in `demo` or `production` mode (`NEXT_PUBLIC_APP_MODE`).

- **GitHub Pages must stay in demo mode.** `deploy:pages` builds without
  Supabase variables, so `APP_MODE` resolves to `demo`. Never set production
  variables in that build.
- Demo says, in those words, that a request is saved in this browser only and
  is not sent to Nature Vibes. Production is honoured only when Supabase
  credentials are present; otherwise it falls back to demo rather than claiming
  a request was received.

## Architecture invariants

Breaking any of these silently undoes a previous round.

- **`shared/` is runtime-neutral.** No React, Next or browser API. Its internal
  imports are relative **with explicit `.ts` extensions**, because the Supabase
  Edge Function imports the same files from Deno. The web app reaches them via
  the `@shared/*` alias.
- **One pricing engine, one rule set.** The Edge Function must never grow its
  own copy. `tests/securityPosture.test.ts` guards this.
- **No browser code inserts into `quote_requests`.** The browser posts a
  `PublicQuoteSubmission` (no price, no validation result) to the `submit-quote`
  Edge Function. Anonymous INSERT is revoked by migration 0002.
- **Services are a single source of truth.** `selectedServiceIds` on the
  session drives both the estimate and the submitted request. Review and Quote
  render the same `ServicesPicker`.
- **Secrets are never `NEXT_PUBLIC_*`.** Anything bundled into the browser is
  public. Server secrets live in Supabase.

## Data discipline

All product data is placeholder seed data — prices, dimensions, materials,
the demo species catalog, aquarium thresholds. Nothing may be presented as
confirmed engineering data, and safety-critical conclusions are always
`review_required`, never an approval. See `docs/assumptions.md`; keep it
current when values change.

## Commands

```bash
npm run dev            # local development
npm test               # vitest
npm run typecheck      # tsc --noEmit
npm run build          # production build
npm run build:pages    # static export with the Pages base path (demo mode)
npm run pages:check    # is the live site current?
npm run deploy:pages   # publish to gh-pages
npm run build:standalone  # single self-contained HTML file
```

`supabase/functions/` is Deno code and is excluded from the Next/tsc project.

## Docs

`docs/implementation-plan.md` · `docs/product-model.md` · `docs/rules.md` ·
`docs/assumptions.md` · `docs/round2-productionization.md` ·
`docs/round2.1-production-boundary.md`
