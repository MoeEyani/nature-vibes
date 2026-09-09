---
project: Nature Vibes
document_type: Design Studio — element-level configuration
version: 1.1
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
| Left | The palette — 2 assemblies and 18 element types, in 8 groups |
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

**Groups.** The first palette section, *Assemblies*, holds things that are made
of other things: a **Pavilion** (posts, beams and a roof) and a **Seating
Layout** (a bench run around a rectangle). Placing one adds a single element to
the design; its parts follow from its settings. Change the span and the posts
move with it, add a bay and a post appears, switch the roof style and only the
roof changes. **Ungroup** turns it into loose elements when the customer wants
to break the pattern.

---

## 1a. Assemblies — the dynamic group

The rule the whole mechanism rests on: **an assembly stores parameters, never
children.**

Its parts are derived from those parameters every time they are needed —
`shared/studio/assemblies.ts` — so nothing is stored twice and there is no
synchronisation to drift. Widening a pavilion does not *move* eight posts; it
means eight posts are computed somewhere else next time. There is no state in
which the span and the posts can disagree, because only one of them is state.

Two consequences follow, and both are load-bearing:

- **The footprint is a result, not an input.** `applyPatch` routes an assembly
  through its parameter specs and recomputes its size; a stray `widthMm` patch
  is ignored rather than allowed to desync it. The properties panel shows the
  footprint as a readout and offers no width box.
- **Everything downstream sees the parts, not the container.** Pricing, rules,
  collision, the dimension envelope and the 3D scene all consume
  `expandDesign(design)`, which replaces each assembly with its parts. A
  pavilion therefore costs the sum of its posts, beams and roof, with a real
  SKU per line — never an invented lump sum. Assemblies carry a zero price of
  their own precisely so that a forgotten expansion shows up as an obviously
  wrong total rather than a plausible one.

Parts of the same assembly are excluded from collision and circulation
checking; a pavilion's own posts are not a clash, and neither is a bench placed
inside it — that being the point of putting it there. A pavilion post against a
*loose* post is still reported.

Adding an assembly is a catalog entry (parameter specs as data, so the
properties panel renders controls for it without knowing what it is) plus a
deriver in `assemblies.ts`. No new panel, no new pricing path, no new geometry
unless it introduces a genuinely new part.

| Assembly | Parameters | Derives |
| --- | --- | --- |
| Pavilion | span W/D, eave height, roof style, overhang, bays W/D, post section | Perimeter posts on the bay grid, four beams landing on the eave line, one roof |
| Seating Layout | layout, span W/D, seat depth, seat height, style | One bench or lounge run per side of the chosen layout |

The seating layouts are read from `shared/catalog/seating.ts` — the guided
wizard's own list — so the two halves of the product cannot disagree about what
a U-shape is.

**Ungroup is a one-way door.** Once exploded the parts are ordinary elements,
freely editable, and the parametric link is gone. That is simpler to reason
about — and to undo, since it is a single history step — than a half-linked
hybrid.

---

## 2. Architecture

The studio follows the project's existing rules exactly.

### Domain in `shared/studio/` — runtime-neutral

```
shared/studio/
  schema.ts       StudioDesign, StudioElement — Zod, millimetres, integers
  catalog.ts      element types, assembly parameter specs, the finish palette
  assemblies.ts   parameters → derived parts; expandDesign
  geometry.ts     footprints, overlap, gaps, snapping, site clamping
  design.ts       create / patch / duplicate / explode / normalise / free spot
  pricing.ts      design → line items → estimated total
  rules.ts        validation, same contract as the configurator's engine
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
`studio:aquarium`, `studio:roof-gable`, …) exactly as the wizard's scene does.
Real GLB assets can replace any branch without touching the studio, the store
or the domain.

An assembly draws nothing of its own (`studio:assembly` renders `null`): the
scene renders the parts it derives. Selection, hover and drag address the
assembly, never a part — derived ids are synthetic and are never persisted, so
there is nothing there to select.

---

## 3. Three decisions worth recording

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

### Derive the parts, do not store them

The obvious implementation of a group is a parent element holding a list of
children, kept in step by an update routine. That routine is the bug: every
edit path that forgets to call it leaves a pavilion whose roof is the old size,
and the failure is invisible until someone reads the quote.

Storing only the parameters removes the class of bug rather than guarding
against it. The cost is that parts are recomputed on demand — cheap here, since
a design holds tens of elements, not thousands.

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
wizard configuration, no re-grouping of exploded parts, no nesting of one
assembly inside another, no multi-select, no copy/paste between designs, and no
server-side validation of studio designs.
The domain is already shaped for the last of those: `evaluateStudioDesign` and
`calculateStudioPrice` are pure functions in `shared/`, which is what the
trusted boundary imports from.
