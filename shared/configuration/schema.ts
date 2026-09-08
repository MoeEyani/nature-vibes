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

/**
 * The working session.
 *
 * Round 2 introduced this so the customer's *service* selection lives beside
 * the configuration instead of in two disconnected places. It is what gets
 * persisted, so services survive a refresh exactly as the configuration does.
 */
export const designSessionSchema = z.object({
  schemaVersion: z.literal(2),
  configuration: designConfigurationSchema,
  /** Ids from the service catalog — the single source of truth for services. */
  selectedServiceIds: z.array(z.string()).default([]),
  /** Design reference, once the design has been saved or quoted. */
  reference: z.string().nullable().default(null),
});
export type DesignSession = z.infer<typeof designSessionSchema>;

/** A design saved to localStorage, plus the outputs captured at save time. */
export const savedDesignSchema = z.object({
  reference: z.string(),
  savedAt: z.string(),
  name: z.string(),
  description: z.string().optional(),
  configuration: designConfigurationSchema,
  /** Added in v2. Defaults to none so v1 records migrate cleanly. */
  selectedServiceIds: z.array(z.string()).default([]),
  estimatedTotal: z.number(),
  validationStatus: validationSeveritySchema,
});
export type SavedDesign = z.infer<typeof savedDesignSchema>;

/** Lifecycle of a lead. Only `new` is set by the customer app. */
export const quoteStatusSchema = z.enum([
  "new",
  "contacted",
  "qualified",
  "quoted",
  "won",
  "lost",
]);
export type QuoteStatus = z.infer<typeof quoteStatusSchema>;

export const quoteCustomerSchema = z.object({
  fullName: z.string().trim().min(2, "Please enter your full name.").max(120),
  email: z
    .string()
    .trim()
    .max(200)
    .email("Please enter a valid email address."),
  phone: z.string().trim().min(6, "Please enter a contact number.").max(40),
  /**
   * The actual installation location. When the customer picks "Other" in the
   * city list the free-text value is stored here, so this is always a real
   * place rather than the literal word "Other".
   */
  city: z
    .string()
    .trim()
    .min(2, "Please tell us where the pavilion will be installed.")
    .max(120)
    .refine(
      (value) => value.toLowerCase() !== "other",
      "Please type the city or area.",
    ),
  preferredContact: z.enum(["email", "phone", "whatsapp"]),
  message: z.string().trim().max(4000).optional(),
  /** Explicit consent to be contacted about this request. */
  consent: z
    .boolean()
    .refine((value) => value, "Please agree to be contacted about this request."),
});
export type QuoteCustomer = z.infer<typeof quoteCustomerSchema>;

export const QUOTE_SCHEMA_VERSION = 1;

export const quoteRequestSchema = z.object({
  reference: z.string().regex(/^NV-[A-Z0-9]{4}-[A-Z0-9]{4}$/),
  submittedAt: z.string(),
  /** Payload version, so the backend can migrate old snapshots. */
  schemaVersion: z.literal(QUOTE_SCHEMA_VERSION),
  status: quoteStatusSchema.default("new"),
  /** Which app produced the request, for support and analytics. */
  source: z.string().default("web-configurator"),
  customer: quoteCustomerSchema,
  /** Service ids, identical to the ones the estimate was priced with. */
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

/**
 * What can be read back for a reference.
 *
 * Deliberately excludes the customer's name, email, phone and message: a
 * design reference is guessable enough that it must not be a key to somebody's
 * contact details. The success screen only needs confirmation facts, and the
 * configuration itself is not personal data.
 */
export const quoteRecordSchema = z.object({
  reference: z.string(),
  submittedAt: z.string(),
  status: quoteStatusSchema,
  estimatedTotal: z.number(),
  currency: z.literal("SAR"),
  isEstimate: z.boolean(),
  validationStatus: validationSeveritySchema,
  additionalServices: z.array(z.string()).default([]),
  configuration: designConfigurationSchema.optional(),
});
export type QuoteRecord = z.infer<typeof quoteRecordSchema>;

/** Reduce a full request to the safe subset above. */
export function toQuoteRecord(request: QuoteRequest): QuoteRecord {
  return {
    reference: request.reference,
    submittedAt: request.submittedAt,
    status: request.status,
    estimatedTotal: request.pricing.estimatedTotal,
    currency: request.pricing.currency,
    isEstimate: request.pricing.isEstimate,
    validationStatus: request.validation.status,
    additionalServices: request.additionalServices,
    configuration: request.configuration,
  };
}
