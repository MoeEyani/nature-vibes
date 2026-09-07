---
project: Nature Vibes
document_type: Rules & Validation Reference
version: 1.0
date: 2026-09-07
---

# Rules & Validation

## 1. Model

Every rule is a pure function `(configuration, derived) → ValidationMessage[]`.
Rules live in `src/domain/rules/rules.ts`, are run by
`evaluateConfiguration()`, and never touch React or the store.

```ts
type ValidationMessage = {
  code: string;                 // stable, shown in the UI and used by grouping
  severity: "ok" | "warning" | "review_required" | "incompatible";
  title: string;
  message: string;
  affectedIds: string[];        // catalog ids or configuration paths
  step?: string;                // where the customer goes to fix it
};
```

## 2. Severities

| Severity | Label shown | Meaning | Blocks the quote? |
| --- | --- | --- | --- |
| `ok` | OK | Nothing to report for this check group | No |
| `warning` | Warning | The design works but the customer should know something | No |
| `review_required` | Engineering Review Required | A qualified professional must verify this before manufacturing or installation. **The configurator never resolves this itself.** | No |
| `incompatible` | Incompatible | These selections cannot be built together | **Yes** |

Only `incompatible` blocks. An engineering review is precisely what a quote
request initiates, so blocking it would be backwards.

The best possible outcome is *"No blocking issues found"*, never *"Approved"*.
`DATA_PLACEHOLDER` always fires, so the overall status is never `ok` while the
catalog is seed data — that is deliberate.

## 3. Rule catalogue

### Catalog-driven

| Code | Severity | Fires when |
| --- | --- | --- |
| `REQ_<item>_<requirement>` | warning | A selected item declares `requires` and it is unmet. Covers *climbing plant → trellis*, *smart lighting → ambient lighting*, *irrigation → planters*, *integrated aquarium → seating*, *aquarium lighting → aquarium*. |
| `INCOMPAT_<a>_<b>` | incompatible | Two selected items declare each other incompatible. Covers *ceiling fan × pergola roof*, *wood-effect finish × timber frame*, *centre aquarium × inside seating*. |
| `UNAVAILABLE_<item>` | incompatible | A `future`/`disabled` item is in the configuration. The message is the item's own `unavailableReason`. |

### Completeness

| Code | Severity | Fires when |
| --- | --- | --- |
| `DIM_PAVILION_MISSING` | incompatible | The pavilion has no width/length/height |
| `DIM_AQUARIUM_MISSING` | incompatible | The aquarium is on with an incomplete tank size |
| `DIM_AQUARIUM_POSITION` | incompatible | The aquarium is on with no position |
| `DIM_SEATING_LAYOUT` | incompatible | Seating is on with no layout |

### Space fit

| Code | Severity | Fires when |
| --- | --- | --- |
| `SPACE_TOO_SMALL_{WIDTH,LENGTH,HEIGHT}` | incompatible | The pavilion exceeds the stated space on that axis; the message states the overshoot |
| `SPACE_TIGHT_{…}` | warning | Under 0.30 m clearance remains on that axis |
| `SPACE_SEAT_COUNT` | warning | The layout gives fewer estimated seats than the stated number of people |

### Geometry

| Code | Severity | Fires when |
| --- | --- | --- |
| `GEOMETRY_CUSTOM_REVIEW` | review_required | Custom or otherwise unsupported shape/size — a bespoke engineering project |
| `GEOMETRY_SIZE_SHAPE_MISMATCH` | incompatible | The size preset is not offered for the selected shape |
| `GEOMETRY_ROOF_SHAPE_MISMATCH` | incompatible | The roof is not offered for the selected shape |

### Safety escalation — never approval

| Code | Severity | Fires when |
| --- | --- | --- |
| `ROOFTOP_AQUARIUM_REVIEW` | review_required | **Rooftop + aquarium.** Requires verified structural capacity, waterproofing and anchoring. The message quotes the estimated filled mass. |
| `ROOFTOP_ANCHORING_REVIEW` | review_required | Any rooftop installation. Names privacy screens explicitly when present, because they add wind area. |
| `AQ_LOAD_REVIEW` | review_required | Estimated filled mass > 150 kg **or** operating volume > 400 L, in any environment. Both thresholds are *Assumptions*. |
| `AQ_ELECTRICAL_REVIEW` | review_required | An aquarium plus any electrical add-on. Circuit protection, IP rating and separation need a qualified electrician. |
| `INDOOR_FLOOR_LOAD` | review_required | An aquarium indoors. Floor capacity at the installation point must be verified. |

### Product logic

| Code | Severity | Fires when |
| --- | --- | --- |
| `INDOOR_MISTING` | incompatible | Misting selected indoors |
| `INDOOR_CLIMBING_ROSE` | warning | Climbing rose indoors — light and airflow |
| `ROOF_OPEN_AQUARIUM` | warning | Open roof (pergola/louvers) over a tank — debris and heating |
| `ROOF_OPEN_CUSHIONS` | warning | Cushioned seating under a roof that does not shed rain |
| `ROOF_FLAT_CLIMBING` | warning | Climbing plants with a flat roof — nothing to spread across |
| `SEAT_CENTER_TANK_CIRCULATION` | warning | Centre tank inside a footprint under 7 m² |
| `SEAT_NONE_WITH_PEOPLE` | warning | People stated but no seating selected |
| `PLANT_INDOOR_LIGHT` | warning | Sun-loving plants indoors |
| `PLANT_SHADE_UNDER_ROOF` | warning | Sun-loving plants under a solid roof |
| `PLANT_NO_PLANTER` | warning | Plants selected with no planter module |
| `PLANT_MAINTENANCE` | warning | Planting without automatic irrigation; also restates that climate suitability is unconfirmed |
| `UTIL_POWER_SUPPLY` | warning | Powered add-ons without the Power & Sockets module |
| `UTIL_WATER_SUPPLY` | warning | Anything needing water — supply and drainage must be confirmed on site |

### Aquatic life — demo data only

| Code | Severity | Fires when |
| --- | --- | --- |
| `SPECIES_VOLUME` | warning | A species' demo minimum volume exceeds the estimated operating volume |
| `SPECIES_TEMPERATURE` | incompatible | The selected species have no overlapping temperature band in the demo catalog (e.g. Goldfish 18–23 °C with Betta 24–29 °C) |
| `SPECIES_TEMPERAMENT` | warning | A species marked territorial is selected alongside others |
| `SPECIES_UNVERIFIED` | warning | Always, while any selected species record has `meta.verified !== true` |

> The species engine exists to prove the **architecture**. Its traits are demo
> data and its messages say so. It is not aquatic-livestock advice, and it must
> not be presented as such until verified data replaces the seed catalog.

### Data confidence

| Code | Severity | Fires when |
| --- | --- | --- |
| `DATA_PLACEHOLDER` | warning | Always. States that every dimension, material, weight and price is a seed value and that nothing here is an approval or a binding quotation. |

## 4. Normalisation vs rules

Two different jobs, deliberately separated.

**Normalisation** (`domain/configuration/normalize.ts`) removes selections that
have become *meaningless*, silently, on every mutation:

- Aquarium off → position, shape, dimensions and species cleared.
- Seating off (or the "No seating" layout) → layout, style and fabric cleared.
- A style with no cushion → fabric cleared.
- Shape changed → the size preset is re-picked from the presets valid for it,
  and the pavilion's dimensions are re-derived from that preset.
- Aquarium off → aquarium-dependent planting and add-ons removed.
- Duplicate and unknown ids dropped.

**Rules** handle everything the customer needs to *decide* about. A climbing
plant without a trellis is not silently deleted and a trellis is not silently
added and charged for; the plants step warns and offers a one-click fix.

Normalisation is idempotent, which is asserted in the tests.

## 5. Presentation

The validation screen shows two things:

1. **Checklist** — ten named groups (structure & anchoring, space & dimensions,
   seating, aquarium load & support, water systems, aquatic life, plant
   compatibility, electrical & lighting, option dependencies, data confidence).
   Each reports its worst severity, so groups with nothing to report read `OK`
   and the customer can see what *was* checked. `groupChecks()` guarantees every
   message lands in exactly one group; anything unclaimed falls into an
   "Overall design" group rather than disappearing.
2. **Findings** — every message, most severe first, each with its code, its
   explanation and a link to the step that fixes it.

## 6. Test coverage

`tests/rules.test.ts` and `tests/normalize.test.ts` cover: the rooftop + aquarium
escalation and its absence in a garden, heavy-tank escalation, custom-geometry
escalation, space-fit blocking, the trellis dependency appearing and clearing,
explicit incompatibility blocking with an explanation, indoor misting, the
size/shape mismatch, all four species rules including the aquarium-off case,
the power-supply warning, severity ordering, complete group coverage, message
completeness, and every normalisation behaviour above.
