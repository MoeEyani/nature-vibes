import { z } from "zod";

/**
 * Design Studio — element-level design model.
 *
 * The guided wizard configures one pavilion from presets. The studio is the
 * other half of the product: the customer places individual elements — posts,
 * benches, planters, a tank, screens — wherever they want them, and each
 * element carries its own properties.
 *
 * Both are placeholder product data. Nothing here is a manufacturing
 * specification; see docs/assumptions.md.
 *
 * Units: millimetres, integers, everywhere — the same rule the rest of the
 * domain follows. Metres exist only in the 3D layer and in formatting.
 */

/** Millimetres. Generous bounds; the catalog constrains each type further. */
const mm = z.number().int();
const positiveMm = z.number().int().positive().max(100_000);

export const studioElementSchema = z.object({
  id: z.string(),
  /** Catalog type this element was placed from. */
  typeId: z.string(),
  /** Centre of the element's footprint on the ground plane. */
  x: mm,
  z: mm,
  /** Rotation about the vertical axis, degrees. */
  rotationDeg: z.number().min(-360).max(360).default(0),
  widthMm: positiveMm,
  depthMm: positiveMm,
  heightMm: positiveMm,
  /** Height of the element's base above the floor (hanging or wall-mounted). */
  elevationMm: z.number().int().min(0).max(10_000).default(0),
  /** Finish/fabric id from the studio palette. */
  colorId: z.string().optional(),
  /** Customer's own name for this element. */
  label: z.string().max(60).optional(),
  /** Locked elements cannot be moved or edited until unlocked. */
  locked: z.boolean().default(false),
  /**
   * Assembly parameters. Present only on assemblies, which store these
   * instead of children and derive their parts from them — see
   * `shared/studio/assemblies.ts`.
   */
  params: z.record(z.string(), z.union([z.number(), z.string()])).optional(),
});

export type StudioElement = z.infer<typeof studioElementSchema>;

export const studioSiteSchema = z.object({
  widthMm: positiveMm,
  depthMm: positiveMm,
});
export type StudioSite = z.infer<typeof studioSiteSchema>;

export const studioDesignSchema = z.object({
  id: z.string(),
  schemaVersion: z.literal(1),
  createdAt: z.string(),
  updatedAt: z.string(),
  name: z.string().max(120).optional(),
  /** The working area the customer is designing within. */
  site: studioSiteSchema,
  /** Snap step. 0 disables snapping. */
  gridMm: z.number().int().min(0).max(1000).default(100),
  elements: z.array(studioElementSchema).max(200).default([]),
});

export type StudioDesign = z.infer<typeof studioDesignSchema>;

/** A studio design saved to localStorage, with its outputs at save time. */
export const savedStudioDesignSchema = z.object({
  reference: z.string(),
  savedAt: z.string(),
  name: z.string(),
  design: studioDesignSchema,
  estimatedTotal: z.number(),
  elementCount: z.number().int(),
});
export type SavedStudioDesign = z.infer<typeof savedStudioDesignSchema>;

export const DEFAULT_SITE: StudioSite = { widthMm: 8000, depthMm: 8000 };
export const DEFAULT_GRID_MM = 100;
