/**
 * Central brand constants.
 *
 * The visual references in the work package use the temporary concept name
 * "AquaBloom". That is a mockup alias only — the confirmed project brand is
 * "Nature Vibes". Renaming the product should never require touching more
 * than this file.
 */
export const BRAND = {
  projectName: "Nature Vibes",
  configuratorName: "Nature Vibes Configurator",
  mockupAlias: "AquaBloom",
  tagline: "Nature Meets Your Space",
  claim: "Nature Lives Better With You",
  currency: "SAR" as const,
  locale: "en",
  supportEmail: "hello@naturevibes.example",
  quoteResponseDays: "1–2 business days",
} as const;

/**
 * localStorage keys.
 *
 * v2 replaced the bare configuration draft with a session that also carries
 * the service selection. The v1 keys are still read once, to migrate anyone
 * who has data under them, and are never written to again — see
 * `src/lib/persistence.ts`.
 */
export const STORAGE_KEYS = {
  session: "nv.configurator.session.v2",
  savedDesigns: "nv.configurator.designs.v2",
  quotes: "nv.configurator.quotes.v2",
  /** Design Studio — element-level designs. */
  studioDesign: "nv.studio.design.v1",
  studioSaved: "nv.studio.designs.v1",
} as const;

/** Read-only, for migration. Never written to. */
export const LEGACY_STORAGE_KEYS = {
  draft: "nv.configurator.draft.v1",
  savedDesigns: "nv.configurator.designs.v1",
  quotes: "nv.configurator.quotes.v1",
} as const;

/**
 * Global disclaimer strings. Every number produced by this MVP originates in
 * placeholder seed data, so the UI must never imply engineering approval.
 */
export const DISCLAIMERS = {
  price:
    "Estimated price based on placeholder seed data. Not a binding quotation.",
  engineering:
    "Placeholder values — requires qualified engineering verification before manufacturing or installation.",
  aquarium:
    "Volume and mass figures are geometric estimates only. Structural capacity, glass thickness and filtration must be verified by a qualified engineer.",
  species:
    "Demo species catalog. Compatibility shown here is illustrative and is not verified aquatic-livestock advice.",
  plants:
    "Demo plant catalog. Final suitability depends on climate, orientation and irrigation, and must be confirmed on site.",
} as const;
