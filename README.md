# Nature Vibes Configurator — MVP

A working customer configurator for the **Nature Vibes** modular garden pavilion.
The customer walks a guided flow from *where the pavilion will live* to a
structured quote request, with a live 3D preview, an estimated price breakdown
and a design-validation report at every step.

This is a **functional prototype**, not a production commerce platform and not a
manufacturing system. Every number it shows is placeholder seed data — see
[`docs/assumptions.md`](docs/assumptions.md) and the "real vs placeholder"
summary below.

> **Naming.** The original concept imagery uses the temporary name *AquaBloom*.
> That is a mockup alias only. The confirmed brand is **Nature Vibes**, and the
> final product name is still an open decision. Renaming is a single edit in
> [`src/constants/brand.ts`](src/constants/brand.ts).

---

## Live demo

**https://moeeyani.github.io/nature-vibes/**

There are two ways to publish there. Pick one — running both at once makes them
fight over the same Pages deployment.

**A. Deploy from a branch (currently live).** The `gh-pages` branch holds a
prebuilt static site. Set **Settings → Pages → Source: _Deploy from a branch_**,
branch `gh-pages`, folder `/ (root)`.

Because nothing rebuilds it automatically, **`gh-pages` must be republished
after every source change** or visitors keep seeing the previous version:

```bash
npm run pages:check     # is the live site serving current source? exit 1 = stale
npm run deploy:pages    # builds out/ and force-pushes it to gh-pages
```

Next.js embeds a random build ID in every page, so a rebuild is never
byte-identical even when nothing changed — which is why `pages:check` exists
rather than a plain diff. It compares the content-hashed files under
`_next/static/chunks/` and the HTML with the build ID normalised away.

**B. GitHub Actions (automatic).** Set **Settings → Pages → Source:
_GitHub Actions_**. The `Deploy to GitHub Pages` workflow then typechecks,
tests, builds and publishes on every push. This needs Actions to be able to
start jobs on the account.

## Running the project

Requires Node.js 20+.

```bash
npm install
npm run dev        # http://localhost:3000
```

Other scripts:

```bash
npm run build         # production build
npm start             # serve the production build
npm run build:static  # static export into out/ (what GitHub Pages serves)
npm run typecheck     # tsc --noEmit
npm test              # vitest — pricing, rules, normalisation, catalog, aquarium math
```

By default the app runs in **demo mode**: quote requests are saved in the
visitor's browser and are never sent anywhere, and the UI says so. Point it at
a Supabase project to run in **production mode**, where a request is only
confirmed after the remote write succeeds — see
[`docs/round2-productionization.md`](docs/round2-productionization.md) and
[`.env.example`](.env.example).

```bash
cp .env.example .env.local   # then fill in the Supabase values for production
```

### Static export

The app has no server-side behaviour — no API routes, no server actions, no
dynamic rendering — so `output: "export"` produces a complete build rather than
a reduced one. Two environment variables control it:

| Variable | Effect |
| --- | --- |
| `NEXT_OUTPUT_EXPORT=1` | Emits a static site into `out/` |
| `NEXT_PUBLIC_BASE_PATH` | Sub-path the site is served from (`/nature-vibes` on Pages) |

Both are unset locally, so `npm run dev` and `npm start` are unaffected.

### Single-file build

`npm run build:standalone` bundles the whole app into one self-contained HTML
file in `dist-standalone/` (~1.7 MB, no server, no network requests). It exists
purely to make the demo shareable as a single link or file.

`tools/standalone/` aliases `next/link` and `next/navigation` to a small hash
router so every component under `src/` is used **unchanged** — there is no
second copy of the application. Pass `--fragment` to emit head + body content
without the document wrapper, for hosts that supply their own.

This is a distribution path only. `npm run dev`, `npm run build` and the Pages
export all use the real Next.js router and are unaffected by it.

---

## Stack

| Concern | Choice |
| --- | --- |
| Framework | Next.js 15 (App Router) + React 19 + TypeScript |
| Styling | Tailwind CSS v4 with design tokens in `src/app/globals.css` |
| 3D | React Three Fiber + three.js, procedural placeholder geometry |
| State | Zustand, one store, all mutations normalised |
| Schema | Zod — configuration, saved designs and quote payloads |
| Tests | Vitest |

---

## How it is put together

The whole application is **data-driven**. Nothing selectable is hard-coded in a
component; options come from the catalog, and one configuration object drives
every output.

```
                   ┌──────────────────────────┐
   catalog seed ──▶│  DesignConfiguration     │
   (src/data)      │  (one object, one store) │
                   └───────────┬──────────────┘
                               │
        ┌──────────────┬───────┴────────┬──────────────────┐
        ▼              ▼                ▼                  ▼
    3D scene       pricing          rules engine       quote payload
  (asset keys)   (line items)   (OK / Warning /       (structured JSON)
                                 Review / Incompatible)
```

### Source layout

```
shared/                     runtime-neutral domain — no React, Next or browser
  types/ catalog/ seed/     product and service catalog
  configuration/            schema, derive, normalize
  aquarium/ pricing/ rules/ the engines
  quotes/ lib/              repository contract, ids
  boundary/                 handleSubmitQuote — the trusted quote boundary
supabase/
  migrations/               schema, RLS, and the Round 2.1 lock-down
  functions/submit-quote/   Deno shell around the shared boundary
src/
  app/                      routes: home, /design/[step], /my-designs, /how-it-works
  components/
    configurator/           wizard shell, stepper, steps/, summary, price, validation
    three/                  Scene, Viewport, sceneModel, modules/ (frame, roof, seating, …)
    ui/                     Button, OptionCard, SwatchOption, Field, Callout, …
    layout/                 header, footer, logo
  constants/                brand.ts (naming, disclaimers), steps.ts (wizard definition)
  data/
    catalog/                environments, pavilions, structure, roofs, seating,
                            aquariums, plants, addons + index
    seed/                   default configuration
  domain/
    aquarium/volume.ts      geometric volume and mass estimates
    configuration/          schema.ts, derive.ts, normalize.ts
    pricing/                calculatePrice.ts
    rules/                  rules.ts, evaluateConfiguration.ts, types.ts
  lib/                      format, id, storage
  store/                    useConfiguratorStore.ts
  types/                    catalog.ts
tests/                      vitest suites
docs/                       implementation plan, product model, rules, assumptions
```

### Modes and the quote pipeline

| | Demo (default) | Production |
| --- | --- | --- |
| Repository | `LocalDemoQuoteRepository` | `RemoteQuoteRepository` (Supabase) |
| Where a request goes | this browser only | the `submit-quote` Edge Function, which writes `public.quote_requests` with the service role |
| Success screen | "saved in this browser only… not sent to Nature Vibes" | shown only after the remote write is confirmed |
| On failure | — | stays on the form, keeps the data, offers retry |

`getQuoteRepository()` chooses from the build's configuration, and no component
knows which implementation it got. Production is honoured only when Supabase
credentials are present; otherwise the app falls back to demo rather than
claiming a request was received.

**No browser code inserts into the database.** The browser posts a
`PublicQuoteSubmission` — customer, configuration and services, with no price
and no validation result — and the trusted boundary produces those itself.
Anonymous INSERT on `quote_requests` is revoked by migration 0002. Both
repositories run the *same* handler: the remote one across the network, the
demo one with `localStorage` in the database's role, so demo is a faithful
rehearsal rather than a laxer path. See
[`docs/round2.1-production-boundary.md`](docs/round2.1-production-boundary.md).

### The four engines

- **Catalog** (`src/data/catalog`) — every option is a `CatalogItem` with a
  stable id, optional SKU, status (`active` / `future` / `disabled`), placeholder
  price, pricing mode, `requires` / `incompatibleWith` / `compatibleWith`, an
  `assetKey` for the 3D layer and a loose `meta` bag for seed metadata.
- **Normalisation** (`domain/configuration/normalize.ts`) — runs after every
  mutation. Aquarium off clears the species; seating off clears style and
  fabric; a shape change re-picks a valid size preset. It only removes
  selections that have become meaningless — anything the customer needs to
  *decide* about stays and becomes a rules message instead.
- **Pricing** (`domain/pricing/calculatePrice.ts`) —
  `configuration + catalog → line items → estimated total`. Every line carries
  item id, SKU, quantity, unit, unit price, subtotal and price status. Quantities
  come from the pricing mode (flat, per m², per linear metre, per unit).
- **Rules** (`domain/rules`) — sixteen rules returning
  `{ code, severity, title, message, affectedIds, step }`. Severities are
  `ok`, `warning`, `review_required`, `incompatible`. Only `incompatible` blocks
  the quote request; `review_required` never means "approved" and never means
  "blocked" either — it means a qualified professional has to sign it off.

Services (delivery, maintenance, consultation, site visit) live in
`data/catalog/services.ts` and are selected through a single
`selectedServiceIds` list on the session. The review step and the quote form
render the *same* picker, and pricing derives from the same list, so the
estimate and the submitted request cannot diverge.

The submission boundary (`shared/boundary/handleSubmitQuote.ts`) runs the rules
and **computes the total itself** rather than accepting one from the client.
It is a pure function with injected side effects, so the identical code runs in
the Supabase Edge Function, in demo mode and in the test suite.

`shared/` is importable from Deno as well as Next.js: its internal imports are
relative with explicit `.ts` extensions, which both toolchains accept. That is
what keeps one pricing engine and one rule set rather than two that drift.

### The 3D layer

`buildSceneModel(config)` turns the configuration into an asset-key description
(`frame`, `roof:pyramid`, `seat:perimeter`, `aquarium:center`, `trellis:post`,
`light:ambient`, …). The React Three Fiber modules render placeholder geometry
for each key. Real GLB/GLTF assets can replace them without touching the
configurator, because nothing upstream knows what a mesh is.

The viewport supports orbit, zoom, pan, a camera reset and per-module show/hide.
Roof style, seating layout, aquarium presence/position/size, planting and
add-ons all visibly change the scene.

---

## What is real and what is a placeholder

**Real — architecture that works today**

- The full customer journey, Location → Success, with state preserved across
  back/next and restored from `localStorage` after a refresh.
- A central catalog with stable ids/SKUs behind every selectable option.
- One configuration object driving the 3D scene, price, rules and quote payload.
- The pricing engine, including per-m² and per-linear-metre scaling and optional
  installation/maintenance services.
- The rules engine, including the dependency, incompatibility, geometry,
  space-fit, utility and safety-escalation rules.
- Aquarium volume and mass arithmetic derived from the entered dimensions.
- Local save/resume, a structured quote payload and a stable design reference.

**Placeholder — must not be treated as product or engineering data**

- Every price. All amounts are `status: "placeholder"` seed values.
- All dimensions, including the 3 × 3 m M3 concept size.
- Material characteristics; no structural capacity or span is claimed anywhere.
- Aquarium glass thickness, stand design, filtration and the load thresholds
  used by the rules.
- The demo species catalog and all of its compatibility traits.
- Plant suitability by climate, orientation and irrigation.
- Roof construction, anchoring, wind loading and rooftop capacity.
- The 3D geometry, which is procedural massing, not a manufacturing model.

Full list with labels (Confirmed / Estimated / Assumption / Needs Measurement):
[`docs/assumptions.md`](docs/assumptions.md).

---

## Documentation

| Document | Contents |
| --- | --- |
| [`docs/implementation-plan.md`](docs/implementation-plan.md) | Build sequence, decisions, tradeoffs, what was deliberately deferred |
| [`docs/product-model.md`](docs/product-model.md) | Configuration schema, catalog model, SKU conventions, pricing model |
| [`docs/rules.md`](docs/rules.md) | Every rule, its code, severity and rationale |
| [`docs/assumptions.md`](docs/assumptions.md) | Every placeholder and unverified value, with its status label |
| [`docs/round2-productionization.md`](docs/round2-productionization.md) | The lead pipeline: repository abstraction, modes, database, security, deployment |
| [`docs/round2.1-production-boundary.md`](docs/round2.1-production-boundary.md) | The trusted boundary: Edge Function, lock-down migration, secrets, anti-spam, deployment |
| [`supabase/migrations/`](supabase/migrations/) | SQL schema, RLS policies and the public read-back function |
| [`supabase/functions/submit-quote/`](supabase/functions/submit-quote/) | The Edge Function that owns quote creation |

---

## Acceptance criteria

All verified in a headless browser run of the full journey:

- [x] Complete the wizard from Location to Success
- [x] Back/Next preserves state
- [x] Refresh restores the saved draft
- [x] All selectable options come from central catalog data
- [x] 3D viewport is interactive (orbit, zoom, pan, reset, module show/hide)
- [x] Roof, seating, aquarium, plants and add-ons visibly affect the scene
- [x] Price changes when priced options change
- [x] Price is labelled Estimated / placeholder throughout
- [x] Aquarium off hides the Aquatic Life step and clears the species
- [x] Rooftop + aquarium produces Engineering Review Required
- [x] Incompatible options are explained, never silent
- [x] Review page summarises the configuration correctly
- [x] Validation page lists rule results as a checklist plus findings
- [x] Designs save locally and reopen from My Designs
- [x] The quote form produces a structured request payload
- [x] Success page shows a stable design reference
- [x] No mockup number is presented as confirmed engineering data

### Round 2 — production lead pipeline

- [x] Existing configurator behaviour preserved; no redesign or rewrite
- [x] Quote submission goes through a repository abstraction
- [x] Production success appears only after confirmed remote persistence
- [x] Demo mode states plainly that nothing was sent
- [x] Refreshing Success restores the reference and the request
- [x] Pricing and service selection are a single source of truth
- [x] Service selection persists across refresh and saved-design load
- [x] Environment cards preselect the clicked environment
- [x] "Other" city captures an actual location
- [x] Existing validation behaviour intact
- [x] New tests cover the productionization changes
- [x] Documentation explains how to configure and deploy the backend

### Round 2.1 — production boundary hardening

- [x] No browser code inserts directly into `quote_requests`
- [x] Anonymous direct INSERT is revoked (migration 0002)
- [x] Trusted Edge code validates the request
- [x] Trusted code produces and stores the validation and price snapshots
- [x] The remote repository uses the trusted submission endpoint
- [x] The private notification URL is not bundled as `NEXT_PUBLIC_*`
- [x] Notification happens only after a successful insert
- [x] Notification failure does not lose the lead
- [x] Demo GitHub Pages behaviour remains intact
- [x] Production failures never render false success
- [x] Tests cover the trusted-boundary behaviour (131 total)
- [x] Deployment and security documentation is complete
