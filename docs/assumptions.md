---
project: Nature Vibes
document_type: Assumptions, Placeholders & Open Questions
version: 1.1
date: 2026-09-09
status: Living document
---

# Assumptions, Placeholders & Open Questions

Status labels follow the project master brief:
**Confirmed** · **Estimated** · **Assumption** · **Needs Measurement**

Nothing in this application is Confirmed product or engineering data. This
document lists every value that would have to be replaced or verified before the
configurator could be used commercially.

---

## 1. Naming

| Item | Status | Note |
| --- | --- | --- |
| Brand name "Nature Vibes" | **Confirmed** | From the master brief |
| "AquaBloom" in the UI references | **Assumption** | Temporary concept/UI name only. Not used anywhere in the application except one explanatory note. |
| Product name "Pavilion M3" | **Assumption** | Working name for the demo platform. Final family names are an open decision. |
| Tagline "Nature Meets Your Space" | **Assumption** | Taken from the reference imagery |

All naming lives in `src/constants/brand.ts`.

---

## 2. Prices — every one is a placeholder

Every `price` in the catalog carries `status: "placeholder"`. The pricing engine
propagates this as `isEstimate: true`, which is what makes the UI say
**Estimated Price**. When real prices arrive and are marked `confirmed`, the
label changes by itself.

| Value | Status | Note |
| --- | --- | --- |
| All catalog amounts (SAR) | **Assumption** | Invented seed values, chosen only to be plausible relative to each other |
| Currency SAR | **Assumption** | From the reference imagery |
| Installation at 12% of the product subtotal | **Assumption** | Placeholder rate, in `data/catalog/services.ts` |
| Maintenance at 6% of the product subtotal per year | **Assumption** | Placeholder rate, in `data/catalog/services.ts` |
| Consultation and site-visit pricing | **Not modelled** | Marked "quoted separately"; they carry no price |
| Tax, discounts, region multipliers | **Not modelled** | Extension points exist in `PricingContext`; both fields are always 0 in V1 |
| Species prices | **Assumption** | Nominal demo livestock allowance, not a real livestock quotation |

---

## 3. Pavilion dimensions

| Value | Status | Note |
| --- | --- | --- |
| M3 nominal 3.0 × 3.0 m | **Assumption** | Concept seed value from the brief, explicitly *not* an approved manufacturing specification |
| Height 2.60 m (2.45 m on the compact preset) | **Assumption** | Chosen to be plausible |
| Presets 2.4 × 2.4, 3.0 × 4.2, 3.0 × 5.4 m | **Assumption** | Invented to give the flow a realistic range |
| Four-post structure | **Assumption** | From the concept imagery |
| Post section 0.10 m (0.13 m timber) | **Assumption** | Visual only. Real sections are Needs Measurement. |
| Roof peak heights (0.16–0.70 m) | **Assumption** | 3D geometry only |
| Final manufacturing dimensions | **Needs Measurement** | Open decision |
| Frame section sizes and spans | **Needs Measurement** | Open decision |
| Structural anchoring and fixings | **Needs Measurement** | Open decision |

---

## 4. Materials & finishes

| Value | Status | Note |
| --- | --- | --- |
| Aluminium / Steel / Timber / Hybrid | **Assumption** | Plausible options from the brief |
| Material descriptions ("lightweight", "corrosion-resistant") | **Assumption** | General characteristics. **No structural capacity, span or load claim is made anywhere in the application.** |
| Finish colours and swatch hexes | **Assumption** | UI colours, not specified paint or coating codes |
| Coating systems, corrosion protection, maintenance intervals | **Needs Measurement** | Not modelled |

---

## 5. Roof

| Value | Status | Note |
| --- | --- | --- |
| Pyramid / Flat / Pergola / Louvers | **Assumption** | From the brief and reference imagery |
| `shadesFully` / `rainProtection` flags | **Assumption** | Drive advisory warnings only |
| Roof construction, falls, gutters, fixings | **Needs Measurement** | Not modelled |
| Wind uplift | **Needs Measurement** | Escalated to review, never calculated |

---

## 6. Seating

| Value | Status | Note |
| --- | --- | --- |
| Layouts and which sides each builds | **Assumption** | Reasonable interpretations of the brief |
| Seat heights 400–450 mm, depths 550–780 mm | **Assumption** | Plausible, not verified ergonomics |
| **0.6 m of bench per person** | **Estimated** | Used for the indicative seat count. Not a certified occupancy figure. |
| Cushion fabrics and colours | **Assumption** | Demo options |
| Weather resistance of fabrics | **Needs Measurement** | Not modelled |

---

## 7. Aquarium

Arithmetic is real; everything it is based on and everything it implies is not.

| Value | Status | Note |
| --- | --- | --- |
| Nominal volume = L × W × H | **Confirmed arithmetic** | Pure geometry, correctly labelled |
| Cylinder factor π/4 | **Confirmed arithmetic** | Cylinder inscribed in its bounding box |
| **Operating volume = 85% of geometric** | **Assumption** | Allowance for substrate, hardscape and freeboard |
| Water density 1.0 kg/L | **Estimated** | Fresh water at room temperature |
| **Filled mass = water × 1.35** | **Assumption** | Allowance for tank, stand, substrate and equipment |
| **150 kg review threshold** | **Assumption** | Placeholder trigger for escalation, not a capacity |
| **400 L review threshold** | **Assumption** | Placeholder trigger for escalation |
| Glass thickness | **Needs Measurement** | Not modelled. Requires qualified verification. |
| Stand design and load path | **Needs Measurement** | Not modelled |
| Filtration sizing, circulation, turnover | **Needs Measurement** | Not modelled |
| Floor / roof structural capacity | **Needs Measurement** | Always escalated, never computed |
| Maintenance access, drainage, leak management | **Needs Measurement** | Not modelled |

---

## 8. Aquatic life — demo catalog

Every species record carries `meta.verified: false`, and the
`SPECIES_UNVERIFIED` rule fires whenever any species is selected.

| Value | Status | Note |
| --- | --- | --- |
| Species list (guppy, neon tetra, goldfish, betta, corydoras) | **Assumption** | Demo data to exercise the compatibility engine |
| Minimum volumes | **Assumption** | Illustrative only |
| Temperature ranges | **Assumption** | Illustrative only |
| Temperament / territoriality flags | **Assumption** | Illustrative only |
| School sizes | **Assumption** | Used for the 3D preview |
| Real compatibility, stocking density, water chemistry, quarantine, sourcing | **Needs Measurement** | Requires a qualified aquatics specialist |

---

## 9. Plants & planters

| Value | Status | Note |
| --- | --- | --- |
| Plant list and habits | **Assumption** | Demo catalog |
| Light requirements | **Assumption** | Used only for advisory warnings |
| Climbing plant → trellis dependency | **Assumption** | Sensible product logic, not horticultural certification |
| Planter dimensions and units per pavilion | **Assumption** | Seed values |
| Suitability by climate, orientation and season | **Needs Measurement** | Must be confirmed on site |
| Irrigation demand, drainage, root volume, soil | **Needs Measurement** | Not modelled |

---

## 10. Add-ons & utilities

| Value | Status | Note |
| --- | --- | --- |
| Add-on list and grouping | **Assumption** | Demo catalog |
| `requiresPower` / `requiresWater` flags | **Assumption** | Drive advisory warnings |
| Electrical specification, circuit protection, IP ratings, RCDs | **Needs Measurement** | Always escalated to a qualified electrician |
| Water supply, pressure, drainage | **Needs Measurement** | Must be confirmed on site |
| Fan clearance, heater clearance to timber and planting | **Needs Measurement** | The heater is deliberately a `future` item for this reason |

---

## 11. Environments

| Value | Status | Note |
| --- | --- | --- |
| Indoor / Garden / Rooftop | **Confirmed** | From the brief |
| Commercial | **Deferred** | `future` status; needs site-specific engineering and permitting |
| Rooftop limits, wind exposure, access | **Needs Measurement** | Always escalated |

---

## 11b. Design Studio

Every element type in `shared/studio/catalog.ts` is placeholder seed data on
the same footing as the product catalog.

| Value | Status | Note |
| --- | --- | --- |
| All 18 element default sizes and resize ranges | **Assumption** | Plausible values, not manufacturing specifications |
| All element prices | **Assumption** | Placeholder, marked as such |
| Finish colours | **Assumption** | UI colours, not paint or coating codes |
| 600 mm minimum circulation gap | **Assumption** | A comfort guideline. **Not** an accessibility standard — the app says so |
| 150 kg tank review threshold | **Assumption** | Shared with the configurator's rules |
| Seat estimate at 0.6 m of bench per person | **Estimated** | Indicative, never a certified occupancy |
| Post spacing, beam spans, section sizes, fixings, anchoring | **Needs Measurement** | Not calculated. Always escalated to `review_required` |

### Assemblies (dynamic groups)

An assembly stores parameters and derives its parts, so its *rules of
composition* are placeholder data too — not just its numbers.

| Value | Status | Note |
| --- | --- | --- |
| Assembly parameter ranges (span 1.8–8.0 m, eave 2.0–3.6 m, overhang 0–800 mm, 1–4 bays, post section 80–200 mm) | **Assumption** | Chosen to bound the tool to plausible shapes, not derived from any structural calculation |
| Posts only on the perimeter of the bay grid | **Assumption** | A layout convention for the demo. Whether a given span needs an intermediate post is **Needs Measurement** |
| Beam depth 160 mm, top landing on the eave line | **Assumption** | Visual convention. Real beam depth follows from the span and is not calculated here |
| Five roof styles and their peak heights (pyramid 700, flat 160, gable 800, pergola 220, louvered 240 mm) | **Assumption** | Massing only. No drainage fall, structure, fixing or wind design is implied |
| Roof prices per m² (1,600–3,800 SAR) | **Assumption** | Placeholder seed values like every other price |
| Seating run inset — side runs shortened by one seat depth at each end | **Assumption** | So corners meet in the demo geometry. Not a joinery detail |
| Lounge seat height taken as 55% of overall height | **Assumption** | A property of the placeholder geometry, not an ergonomic standard |

A derived pavilion is **not** an engineered structure. It is a massing study
priced from a placeholder bill of materials, and every structural conclusion
about it remains `review_required`.

## 12. 3D

| Value | Status | Note |
| --- | --- | --- |
| All geometry | **Assumption** | Procedural placeholder massing. Not a manufacturing model and not dimensionally authoritative beyond the overall footprint. |
| Colours, metalness, roughness | **Assumption** | Visual only |
| Fish animation, foliage clumps, lighting | **Assumption** | Illustrative |
| Real GLB/GLTF assets | **Not present** | The `assetKey` abstraction exists so they can be added without touching the configurator |

---

## 13. Site & project facts deliberately not encoded

From the master brief's Needs Measurement list — none of this is in the app,
and none of it should be inferred from it:

Yard dimensions and site plan · entrance width and delivery route · electrical
locations and capacity · water sources · drainage and stormwater · sun and shade
through the day and seasons · tree root zones · workshop and storage areas ·
final display areas · first prototype specification · final structural and roof
materials · mobility/levelling system for mobile versions · electrical
specification · tank, filtration and maintenance specification · real prices,
costs and suppliers.

---

## 14. How to retire an entry from this list

1. Replace the seed value with real data in the catalog or the relevant domain
   module.
2. Change its `price.status` to `confirmed`, or set `meta.verified: true`, or
   replace the threshold in `domain/rules/rules.ts`.
3. Move the row here to **Confirmed** with the date and the source.
4. Re-run `npm test`. The catalog suite currently asserts that **no** seed price
   is marked `confirmed`; relax that assertion as real prices land. The rules
   suite asserts that the safety escalations still fire — those must keep
   passing regardless.
