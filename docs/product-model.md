---
project: Nature Vibes
document_type: Product & Data Model
version: 1.0
date: 2026-09-07
---

# Product & Data Model

## 1. Principle

One configuration object drives everything. The 3D scene, the price breakdown,
the validation report and the quote payload are all pure functions of it. No
component keeps its own copy of a customer choice, and no component computes
money or compatibility on its own.

## 2. The configuration

`src/domain/configuration/schema.ts`

```ts
type DesignConfiguration = {
  id: string;                    // cfg_xxxxxxxxxx
  schemaVersion: 1;              // stored drafts are validated against this
  createdAt: string;
  updatedAt: string;
  name?: string;

  environment: "ENV-INDOOR" | "ENV-GARDEN" | "ENV-ROOFTOP";

  space: {                       // advisory: the customer's available space
    lengthMm?: number;
    widthMm?: number;
    heightMm?: number;
    people?: number;
  };

  pavilion: {                    // the product itself
    familyId: string;            // PAV-M3
    shapeId: string;             // SHAPE-SQUARE | SHAPE-RECT
    sizePresetId: string;        // SIZE-3X3 …  (drives the three dimensions)
    widthMm: number;
    lengthMm: number;
    heightMm: number;
  };

  structure: { materialId: string; finishId: string };
  roof:      { roofId: string };

  seating: {
    enabled: boolean;
    layoutId?: string;
    styleId?: string;
    fabricId?: string;           // cleared unless the style has a cushion
  };

  aquarium: {
    enabled: boolean;
    positionId?: string;
    shapeId?: string;
    lengthMm?: number;
    widthMm?: number;
    heightMm?: number;
    selectedSpeciesIds: string[];
  };

  plants: { plantIds: string[]; planterIds: string[] };
  addons: string[];
};
```

Validation results are **not** stored on the configuration. They are derived on
demand by `evaluateConfiguration(config)`, so they can never go stale. They are
snapshotted only when a quote is submitted, as part of the immutable payload.

### Units

Millimetres internally, everywhere, as integers. Metres and centimetres exist
only in `lib/format.ts` and in the 3D layer (which works in metres). This
removes the single most common source of drift in configurators.

## 3. The catalog

`src/types/catalog.ts`, seeded across `src/data/catalog/*`.

```ts
type CatalogItem = {
  id: string;                    // stable, referenced by the configuration
  sku?: string;                  // manufacturing-facing reference
  category: CatalogCategory;
  name: string;
  status: "active" | "future" | "disabled";
  description?: string;
  unavailableReason?: string;    // required whenever status !== "active"
  price?: { amount: number; currency: "SAR"; status: "placeholder" | "confirmed" };
  pricingMode?: "flat" | "perSquareMetre" | "perLinearMetre" | "perUnit";
  compatibleWith?: string[];
  incompatibleWith?: string[];
  requires?: string[];           // item ids or capability tokens
  tags?: string[];
  assetKey?: string;             // the 3D layer's only contract
  meta?: Record<string, unknown>;
};
```

### Categories

`environment`, `pavilion`, `shape`, `sizePreset`, `material`, `finish`, `roof`,
`seatingLayout`, `seatingStyle`, `fabric`, `aquariumPosition`, `aquariumShape`,
`species`, `plant`, `planter`, `addon`.

### Statuses

- `active` — selectable.
- `future` — rendered, not selectable, shows `unavailableReason`. This is how the
  product roadmap stays visible (Hexagon, Custom size, Commercial, Green roof,
  Tensile canopy, Perimeter aquarium, Bow-front tank, Koi, Specimen tree,
  Storage bench, Custom RAL, Integrated audio, Radiant heater, Pavilion M4).
- `disabled` — temporarily unavailable. Same treatment.

A `future`/`disabled` item that somehow reaches the configuration is caught by
the `UNAVAILABLE_*` rule as `incompatible`.

### Capability tokens

`requires` may name a *state* rather than an item:

| Token | Satisfied when |
| --- | --- |
| `AQUARIUM` | the aquarium is enabled |
| `SEATING` | seating is enabled with a layout |
| `PLANTERS` | at least one planter module is selected |
| `PLANTS` | at least one plant is selected |
| `POWER` | the Power & Sockets add-on is selected |

This is why "Automatic Irrigation requires planters" is one seed-data field
rather than a bespoke rule.

## 4. SKU conventions

Ids are readable and grouped by prefix; SKUs are the manufacturing-facing form.

```
PAV-M3          Nature Vibes Pavilion M3        SKU PAV-M3-SQ
SIZE-3X3        3.0 × 3.0 m preset              SKU PAV-M3-3030
SHAPE-SQUARE    Square
MAT-ALU         Aluminium                       SKU MAT-ALU-01
FIN-MATTE-BLACK Matte Black
ROOF-PYRAMID    Pyramid roof                    SKU ROOF-PYR-01
SEAT-PERIMETER  Perimeter bench                 SKU SEAT-PER-01
SEATSTYLE-*     Seat style          FAB-*       Cushion fabric
AQ-CENTER       Centre aquarium                 SKU AQ-CTR-01
AQSHAPE-RECT    Rectangular tank
FISH-*          Demo species
PLANTER-BOX-001 Edge planter box                SKU PLT-BOX-01
PLANT-CLIMB-001 Climbing jasmine                SKU PLN-CLB-01
ADD-LED-AMBIENT Ambient LED lighting            SKU ADD-LED-01
```

The SKU list rendered on the review step is the seed of a future bill of
materials: it is already the exact set of catalog records a configuration
resolves to.

## 5. Derived values

`src/domain/configuration/derive.ts` computes, once, what pricing, rules and the
3D layer all need:

| Value | Meaning |
| --- | --- |
| `footprintM2` | width × length, drives per-m² pricing |
| `perimeterM` | 2 × (width + length) |
| `seatingRunM` | perimeter × the layout's `runFactor`, drives per-linear-metre pricing |
| `estimatedSeats` | `seatingRunM / 0.6` — **Estimated**, not a certified capacity |
| `aquarium` | the volume/mass estimates below |
| `clearance` | space minus pavilion, per axis |
| `spaceTooSmall` | any axis negative |

## 6. Aquarium arithmetic

`src/domain/aquarium/volume.ts`. Three distinct figures, deliberately never
collapsed into one "volume":

| Figure | Definition |
| --- | --- |
| **Nominal volume** | `length × width × height` of the bounding box, in litres |
| **Geometric volume** | nominal × the tank shape's `volumeFactor` (a cylinder inscribed in its box holds π/4 of it) |
| **Operating volume** | geometric × 0.85 — substrate, hardscape and freeboard |
| **Water mass** | operating volume × 1.0 kg/L |
| **Estimated filled mass** | water mass × 1.35 — an *Assumption* covering tank, stand, substrate and equipment |

None of this is an engineering calculation. Glass thickness, stand design,
filtration sizing, floor capacity and stocking limits are all out of scope.

## 7. Pricing model

`src/domain/pricing/calculatePrice.ts`

```
calculatePrice(configuration, context) → {
  lines: PriceLine[],        // itemId, sku, description, group, quantity, unit,
                             // unitPrice, subtotal, priceStatus, note
  productSubtotal, servicesSubtotal, total,
  currency: "SAR",
  isEstimate,                // true while ANY line is placeholder
  tax: 0, discount: 0        // V2 extension points, always zero in V1
}
```

Quantity comes from `pricingMode`:

| Mode | Quantity | Example |
| --- | --- | --- |
| `flat` | 1 | ceiling fan, aquarium position |
| `perSquareMetre` | pavilion footprint | frame material, roof |
| `perLinearMetre` | seating run | bench layout, cushion style |
| `perUnit` | `meta.unitsPerPavilion` | planter modules |

Services (`includeInstallation`, `includeMaintenance`) are derived as a share of
the product subtotal at placeholder rates of 12% and 6%. Region multipliers,
discounts, tax and custom-engineering fees have a home in `PricingContext` and
the breakdown shape, but are not modelled in V1.

`isEstimate` is what makes the UI say "Estimated Price". It flips to `false`
automatically the day every contributing catalog price is marked `confirmed` —
no UI change required.

## 8. Persistence

| Key | Contents |
| --- | --- |
| `nv.configurator.draft.v1` | the working configuration, written on every mutation |
| `nv.configurator.designs.v1` | saved designs (`SavedDesign[]`) |
| `nv.configurator.quotes.v1` | submitted quote payloads (`QuoteRequest[]`) |

Every read is validated with Zod. A draft that fails validation is discarded and
the default configuration is used, so a schema change can never leave a customer
stuck on a broken saved state.

## 9. Quote payload

```ts
type QuoteRequest = {
  reference: string;            // NV-XXXX-XXXX, stable once assigned
  submittedAt: string;
  customer: { fullName, email, phone, city, preferredContact, message? };
  additionalServices: string[];
  configuration: DesignConfiguration;   // the full snapshot
  pricing: { estimatedTotal, currency: "SAR", isEstimate };
  validation: { status, messages };     // the findings at submission time
};
```

The payload is built and validated exactly as it would be for a real endpoint;
V1 simply stores it locally instead of `POST`ing it.
