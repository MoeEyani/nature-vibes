---
project: Nature Vibes
document_type: Implementation Plan
version: 1.0
date: 2026-09-07
status: V1 delivered
---

# Nature Vibes Configurator — Implementation Plan

## 1. Starting point

The workspace was an empty repository. The inputs were:

- `Nature_Vibes_Configurator_ChatGPT_Work_Brief.md` — the build handoff.
- `source_briefs/` — the project master brief and the current-state brief.
- `references/ui/` — twelve UI direction images (branded *AquaBloom*).
- `references/product/` — concept renders and blueprint-style sketches.

Because there was no existing codebase, the stack recommended in the brief was
adopted as-is: Next.js + React + TypeScript, Tailwind, React Three Fiber,
Zustand, Zod, local JSON/TS seed catalog, `localStorage` persistence, Vitest.

## 2. Objective, constraints, decisions

**Objective.** A functional, desktop-first MVP that proves the customer journey,
the modular configuration model, the pricing architecture and the compatibility
architecture — sufficiently that real product data can be dropped in later
without a rewrite.

**Constraints taken from the briefs.**

- One mother platform (M3), not a product family.
- No invented engineering data, prices, capacities, species limits or site facts.
- Anything safety-critical is escalated, never approved.
- Customisation must stay inside manufacturable limits.
- Naming must be trivially changeable (`AquaBloom` → `Nature Vibes`).

**Key decisions and their tradeoffs.**

| Decision | Alternative rejected | Why |
| --- | --- | --- |
| Size **presets** rather than free dimension entry | Free-size geometry | Free size makes every order a bespoke engineering project. Presets keep V1 repeatable; `SIZE-CUSTOM` exists as a `future` item so the roadmap is visible. |
| Customer's available space is **advisory input**, not the pavilion's dimensions | Deriving the pavilion from the entered space | Keeps the buildable envelope under product control while still catching "it doesn't fit". |
| Catalog `requires` / `incompatibleWith` generate rules automatically | Bespoke code per constraint | Most new product constraints become a seed-data edit, not a code change. |
| **Capability tokens** (`AQUARIUM`, `SEATING`, `PLANTERS`, `POWER`) alongside item ids in `requires` | Item ids only | Lets the irrigation add-on depend on *having planters*, not on one specific planter SKU. |
| Normalisation clears only *meaningless* selections; unmet item dependencies stay and become warnings | Auto-deleting or auto-adding | Silently deleting a customer's choice is hostile; silently adding a priced item is worse. The UI offers an explicit one-click fix instead. |
| `review_required` blocks nothing | Blocking the quote | An engineering review is exactly what a quote request is *for*. Only `incompatible` blocks. |
| Procedural three.js geometry behind stable **asset keys** | Waiting for real GLB assets | The configurator can be finished and validated now; assets swap in later with no upstream change. |
| One Zustand store with a single `apply()` mutation path | Per-slice stores or context | Every mutation is normalised and persisted in one place, so no consumer can see inconsistent state. |
| `localStorage` only | A backend | The brief explicitly says not to overbuild backend infrastructure in V1. |

## 3. Build sequence as executed

**Phase A — Inspect & plan.** Read both source briefs and the work brief; reviewed
the UI references for layout, hierarchy and brand feel (dark forest green + warm
cream, serif display headings, generous card-based option grids); confirmed the
repository was empty; recorded the naming caveat and the "no invented data" rule
as hard constraints.

**Phase B — Skeleton.** Next.js App Router shell, design tokens in
`globals.css`, `BRAND` constants, the fourteen-step wizard definition in
`constants/steps.ts` (including the conditional visibility predicate for the
aquatic-life step), header/footer/stepper, desktop-first split layout.

**Phase C — Product state.** Zod schema for the configuration, saved designs and
quote payloads; the seed catalog across eight files; the normaliser; the Zustand
store with draft persistence, save/load, quote submission and reset.

**Phase D — Functional steps.** Ten configuration steps, each reading options
from the catalog through one shared `OptionCard`. Unavailable options render with
their reason rather than disappearing, so the customer sees the roadmap.

**Phase E — 3D.** `buildSceneModel` as the configuration → asset-key boundary;
module components for frame, roof (four styles), seating (layout-driven bench
runs), aquarium (tank, water, substrate, stand, animated demo livestock),
planting (edge/corner/hanging/trellis/aquatic + foliage), and add-ons
(LED strip, fan, privacy screens, misting, water feature, storage). Orbit, zoom,
pan, camera reset and per-module show/hide.

**Phase F — Price + rules.** The pricing engine with four pricing modes and
service extension points; sixteen rules; the checklist grouping used by the
validation screen; 51 unit tests.

**Phase G — Review + quote.** Review with full summary, itemised breakdown and
SKU list; validation with a checklist plus findings; save/quote tabs; success
state with a stable `NV-XXXX-XXXX` reference.

**Phase H — QA.** Full journey driven in headless Chromium: fourteen steps,
option changes, the trellis dependency fix, the rooftop escalation, quote
submission, refresh-restore, save/reload from My Designs, and a deliberately
incompatible combination confirming the quote is blocked with an explanation.
One real bug was found and fixed: deep-linking to `/design/aquatic-life`
redirected away because the redirect ran before the draft hydrated.

## 4. What was deliberately not built

Per the brief's "can come later" and "do not do yet" lists:

- More pavilion families, true custom geometry, AR.
- Customer accounts, payment, checkout, CRM.
- Automated BOM, supplier system, manufacturing drawings, production scheduling.
- Advanced ecosystem simulation.
- Any backend service. The quote payload is built, validated and stored locally;
  swapping in a real `POST` is a one-line change in
  `useConfiguratorStore.submitQuote`.

## 5. Where real data plugs in

| When you have… | Change this | Nothing else moves |
| --- | --- | --- |
| Real prices | `price.amount` + `price.status: "confirmed"` in the catalog | Pricing engine, UI labels flip from "Estimated" automatically |
| Real dimensions | `meta.widthMm/lengthMm/heightMm` on the size presets | Scene, footprint, per-m² pricing, fit rules |
| Real GLB assets | The module components behind each `assetKey` | The whole configurator |
| Verified species data | `meta.verified: true` + real traits in `SPECIES` | `SPECIES_UNVERIFIED` stops firing; the other checks keep working |
| Verified structural limits | The thresholds in `domain/rules/rules.ts` | Rule codes, messages and severities |
| A quote endpoint | `submitQuote` in the store | The form, the payload schema, the success state |

## 6. Open decisions (must not be closed silently)

Final pavilion engineering dimensions · frame section sizes · roof construction ·
structural anchoring · rooftop limits · aquarium glass thickness · filtration
sizing · permitted species · plant suitability by climate · real selling prices ·
final product family names · the final product name.

These are represented as editable seed data, `future`-status catalog items or
`review_required` rules — never as settled facts.
