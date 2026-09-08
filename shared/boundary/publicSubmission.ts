import { z } from "zod";
import {
  designConfigurationSchema,
  quoteCustomerSchema,
  QUOTE_SCHEMA_VERSION,
} from "../configuration/schema.ts";

/**
 * What the browser is allowed to send.
 *
 * Deliberately excludes the price and the validation result. Round 2 let the
 * client compute those and the boundary re-checked them; Round 2.1 stops
 * accepting them at all, so there is nothing to tamper with. The trusted code
 * derives both from the configuration.
 */
export const publicQuoteSubmissionSchema = z.object({
  schemaVersion: z.literal(QUOTE_SCHEMA_VERSION),
  /** Optional. Validated for shape; the boundary generates one when absent. */
  reference: z
    .string()
    .regex(/^NV-[A-Z0-9]{4}-[A-Z0-9]{4}$/, "Malformed design reference.")
    .optional(),
  customer: quoteCustomerSchema,
  configuration: designConfigurationSchema,
  selectedServiceIds: z.array(z.string()).max(20).default([]),
  source: z.literal("web-configurator"),
  antiSpam: z
    .object({ turnstileToken: z.string().max(4096).optional() })
    .optional(),
});

export type PublicQuoteSubmission = z.infer<typeof publicQuoteSubmissionSchema>;

/** Error codes the endpoint may return. Safe to show to a customer. */
export type PublicErrorCode =
  | "validation"
  | "configuration_rejected"
  | "duplicate"
  | "rate_limited"
  | "captcha_failed"
  | "server_error";

export type PublicQuoteSubmissionResult =
  | { ok: true; reference: string; submittedAt: string; status: "new" }
  | { ok: false; error: { code: PublicErrorCode; message: string } };

/** HTTP status for each outcome, so the shell stays a thin mapping. */
export const STATUS_FOR_CODE: Record<PublicErrorCode, number> = {
  validation: 400,
  configuration_rejected: 400,
  duplicate: 409,
  rate_limited: 429,
  captcha_failed: 403,
  server_error: 500,
};
