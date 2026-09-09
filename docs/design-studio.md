---
project: Nature Vibes
document_type: Design Studio — element-level configuration
version: 1.0
date: 2026-09-09
status: Delivered on branch claude/nature-vibes-design-studio
---

# Design Studio

The guided wizard configures **one pavilion from presets**. The studio is the
other half of the product: the customer places **individual elements** wherever
they want them, and edits each one's properties.

Both exist side by side. The wizard is unchanged — this round adds a section,
it does not replace one.

---

## 1. What it does

A three-pane workspace at `/studio`:

| Pane | Contents |
| --- | --- |
| Left | The palette — 18 element types in 7 groups |
| Centre | The 3D canvas |
| Right | Properties of the selection, then a live summary |

**Placing.** Press a palette item and drag onto the canvas; a ghost preview
follows the pointer at the snapped position and a drop pad shows where it will
land. Releasing commits it. Tapping instead of dragging drops the element at
the first clear spot near the centre — which is what makes the tool usable on
a touch screen.

**Editing.** Click an element to select it. Drag it to move. The properties
panel edits width, depth, height, height-above-floor, rotation, position,
finish and name, each held inside what that element type actually permits.

**Keyboard.** Arrow keys nudge by the snap step · `R` rotates (`Shift+R`
anticlockwise) · `D` duplicates · `Delete` removes · `Escape` deselects ·
`Ctrl/Cmd+Z` undoes, `Shift` redoes.

**Feedback.** Hover outlines an element, selection outlines it and draws a
footprint pad on the floor, and anything overlapping something else is drawn
in the alert colour. Dimension lines show the overall envelope and the
selected element's own width, depth and height.

**View.** 3D and Plan, a grid with an adjustable snap step (off / 50 / 100 /
250 / 500 mm), a site size, and an orientation gizmo.

---

## 2. Architecture

The studio follows the project's existing rules exactly.

### Domain in `shared/studio/` — runtime-neutral

```
shared/studio/
  schema.ts     StudioDesign, StudioElement — Zod, millimetres, integers
  catalog.ts    18 element types + the finish palette
  geometry.ts   footprints, overlap, gaps, snapping, site clamping
  design.ts     create / patch / duplicate / normalise / find a free spot
  pricing.ts    design → line items → estimated total
  rules.ts      validation, same contract as the configurator's engine
```

No React, no Next, no browser API — so the Supabase Edge Function can validate
a studio design at the trusted boundary later without a second implementation,
exactly as it already does for wizard configurations.

### Reuse rather than duplication

- `pricing.ts` emits the existing `PriceLine` / `PriceBreakdown` types, so the
  configurator's breakdown table renders a studio design unchanged.
- `rules.ts` emits the existing `ValidationMessage` shape and the same four
  severities, so `SeverityBadge` and the validation UI work as they are.
- Aquarium volume and mass come from the existing
  `shared/aquarium/volume.ts` — one implementation of that arithmetic.

### 3D by asset key

`ElementGeometry` switches on `assetKey` (`studio:post`, `studio:bench`,
`studio:aquarium`, …) exactly as the wizard's scene does. Real GLB assets can
replace any branch without touching the studio, the store or the domain.

---

## 3. Two decisions worth recording

### Oriented-rectangle overlap, not bounding boxes

Elements rotate to any angle. An axis-aligned test reports collisions that are
not there the moment anything is off-axis, so overlap uses the **separating
axis theorem** on the real footprints.

The same applies to the gap measurement behind the circulation check: measuring
between axis-aligned boxes returns 0 for two rotated elements whose boxes
overlap while the elements are well apart — which would silently switch the
check off for anything not square to the grid. `gapBetween` measures edge to
edge between oriented footprints. Both are covered by tests that fail against
the naive implementation.

### Ray-to-plane pointer tracking, not a floor mesh

Tracking the drag by raycasting against the floor mesh breaks as soon as the
pointer passes over something already placed: the ray hits that object, the
ghost stops following, and the drop is silently lost. That is the *normal*
case — dropping a chair onto a deck. `PointerTracker` intersects the pointer
ray with the mathematical `y = 0` plane instead, which has no blind spot.
Releasing away from the canvas abandons the drag rather than dropping the
element wherever it was last seen.

---

## 4. Validation

Same severities, same discipline: `incompatible` blocks, `review_required`
means a qualified professional must sign it off, and the tool never approves
anything.

| Code | Severity | Meaning |
| --- | --- | --- |
| `STUDIO_OVERLAP` | incompatible | Solid elements occupy the same space |
| `STUDIO_UNKNOWN_TYPE` | incompatible | An element type not in the catalog |
| `STUDIO_AQ_LOAD_*` | review_required | Estimated filled mass over the 150 kg placeholder threshold |
| `STUDIO_AQ_RAISED_*` | review_required | A raised tank needs an engineered stand |
| `STUDIO_ELECTRICAL_WATER` | review_required | Lighting placed with water |
| `STUDIO_STRUCTURE_REVIEW` | review_required | Post spacing, spans, fixings and anchoring are not calculated here |
| `STUDIO_WIND_LOAD` | review_required | Screens add wind area |
| `STUDIO_OUTSIDE_SITE` | warning | Elements beyond the working area |
| `STUDIO_CIRCULATION` | warning | Under 600 mm to walk between — a comfort guideline, not an accessibility standard |
| `STUDIO_BEAM_UNSUPPORTED` | warning | A beam with fewer than two posts |
| `STUDIO_PLANT_NO_CONTAINER` | warning | Planting with nothing to grow in |
| `STUDIO_PLANT_SUITABILITY` | warning | Climate and light are unconfirmed |
| `STUDIO_POWER_SUPPLY` | warning | Lighting needs mains power on site |
| `STUDIO_EMPTY` | warning | Nothing placed yet |
| `STUDIO_DATA_PLACEHOLDER` | warning | Always — sizes and prices are seed values |

Each message carries the ids of the elements it concerns, so clicking a finding
in the summary selects the element that caused it.

---

## 5. Data discipline

Unchanged from the rest of the project. Every element size, finish colour and
price in `shared/studio/catalog.ts` is a **placeholder seed value**. Nothing is
presented as confirmed engineering data. Structural conclusions are always
escalated, never approved. See `docs/assumptions.md`.

---

## 6. Persistence

`nv.studio.design.v1` holds the working design; `nv.studio.designs.v1` holds
saved ones. Everything read back is validated with Zod and re-normalised
through the domain invariants, so a stored design with an element type that no
longer exists degrades gracefully instead of crashing.

Undo history keeps 60 steps and records **committed edits only** — hover,
ghost position and selection are never recorded, so undo steps back through
real changes rather than through mouse movements.

---

## 7. Not in this round

No quote flow from the studio, no conversion between a studio design and a
wizard configuration, no roof or canopy elements, no multi-select, no
copy/paste between designs, and no server-side validation of studio designs.
The domain is already shaped for the last of those: `evaluateStudioDesign` and
`calculateStudioPrice` are pure functions in `shared/`, which is what the
trusted boundary imports from.
