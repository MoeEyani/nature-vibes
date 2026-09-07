import { z } from "zod";

/**
 * The configuration schema.
 *
 * One configuration object drives every output: the 3D scene, the price
 * breakdown, the validation results, the review summary and the quote
 * payload. Nothing downstream keeps its own copy of the customer's choices.
 */

export const environmentIdSchema = z.enum([
  "ENV-INDOOR",
  "ENV-GARDEN",
  "ENV-ROOFTOP",
]);
export type EnvironmentId = z.infer<typeof environmentIdSchema>;

/** Millimetres, kept as integers to avoid unit drift across the app. */
const mm = z.number().int().positive().max(50_000);

export const spaceSchema = z.object({
  lengthMm: mm.optional(),
  widthMm: mm.optional(),
  heightMm: mm.optional(),
  people: z.number().int().min(1).max(40).optional(),
});

export const pavilionSchema = z.object({
  familyId: z.string(),
  shapeId: z.string(),
  sizePresetId: z.string(),
  widthMm: mm,
  lengthMm: mm,
  heightMm: mm,
});

export const structureSchema = z.object({
  materialId: z.string(),
  finishId: z.string(),
});

export const roofSchema = z.object({
  roofId: z.string(),
});

export const seatingSchema = z.object({
  enabled: z.boolean(),
  layoutId: z.string().optional(),
  styleId: z.string().optional(),
  fabricId: z.string().optional(),
});

export const aquariumSchema = z.object({
  enabled: z.boolean(),
  positionId: z.string().optional(),
  shapeId: z.string().optional(),
  lengthMm: mm.optional(),
  widthMm: mm.optional(),
  heightMm: mm.optional(),
  selectedSpeciesIds: z.array(z.string()).default([]),
});

export const plantsSchema = z.object({
  plantIds: z.array(z.string()).default([]),
  planterIds: z.array(z.string()).default([]),
});

export const validationSeveritySchema = z.enum([
  "ok",
  "warning",
  "review_required",
  "incompatible",
]);
export type ValidationSeverity = z.infer<typeof validationSeveritySchema>;

export const validationMessageSchema = z.object({
  code: z.string(),
  severity: validationSeveritySchema,
  title: z.string(),
  message: z.string(),
  /** Catalog ids or configuration paths the message refers to. */
  affectedIds: z.array(z.string()).default([]),
  /** Wizard step the customer should return to in order to resolve it. */
  step: z.string().optional(),
});
export type ValidationMessage = z.infer<typeof validationMessageSchema>;

export const validationSchema = z.object({
  status: validationSeveritySchema,
  messages: z.array(validationMessageSchema).default([]),
});

export const designConfigurationSchema = z.object({
  id: z.string(),
  /** Schema version, so stored drafts can be migrated or rejected. */
  schemaVersion: z.literal(1),
  createdAt: z.string(),
  updatedAt: z.string(),
  name: z.string().optional(),
  environment: environmentIdSchema,
  space: spaceSchema,
  pavilion: pavilionSchema,
  structure: structureSchema,
  roof: roofSchema,
  seating: seatingSchema,
  aquarium: aquariumSchema,
  plants: plantsSchema,
  addons: z.array(z.string()).default([]),
});

export type DesignConfiguration = z.infer<typeof designConfigurationSchema>;
export type Space = z.infer<typeof spaceSchema>;
export type Pavilion = z.infer<typeof pavilionSchema>;
export type SeatingConfig = z.infer<typeof seatingSchema>;
export type AquariumConfig = z.infer<typeof aquariumSchema>;

/** A design saved to localStorage, plus the outputs captured at save time. */
export const savedDesignSchema = z.object({
  reference: z.string(),
  savedAt: z.string(),
  name: z.string(),
  description: z.string().optional(),
  configuration: designConfigurationSchema,
  estimatedTotal: z.number(),
  validationStatus: validationSeveritySchema,
});
export type SavedDesign = z.infer<typeof savedDesignSchema>;

export const quoteRequestSchema = z.object({
  reference: z.string(),
  submittedAt: z.string(),
  customer: z.object({
    fullName: z.string().min(2, "Please enter your full name."),
    email: z.string().email("Please enter a valid email address."),
    phone: z.string().min(6, "Please enter a contact number."),
    city: z.string().min(2, "Please tell us where the pavilion will be installed."),
    preferredContact: z.enum(["email", "phone", "whatsapp"]),
    message: z.string().optional(),
  }),
  additionalServices: z.array(z.string()).default([]),
  configuration: designConfigurationSchema,
  pricing: z.object({
    estimatedTotal: z.number(),
    currency: z.literal("SAR"),
    /** True while any line item is placeholder seed data. */
    isEstimate: z.boolean(),
  }),
  validation: validationSchema,
});
export type QuoteRequest = z.infer<typeof quoteRequestSchema>;
