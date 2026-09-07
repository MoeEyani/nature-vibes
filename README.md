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

## Running the project

Requires Node.js 20+.

```bash
npm install
npm run dev        # http://localhost:3000
```

Other scripts:

```bash
npm run build      # production build
npm start          # serve the production build
npm run typecheck  # tsc --noEmit
npm test           # vitest — pricing, rules, normalisation, catalog, aquarium math
```

There is no backend, no database and no environment configuration. V1 persists
drafts, saved designs and submitted quote requests in `localStorage`.

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
