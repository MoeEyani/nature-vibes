import {
  quoteRequestSchema,
  type QuoteRequest,
} from "@/domain/configuration/schema";
import { evaluateConfiguration } from "@/domain/rules/evaluateConfiguration";
import { calculatePrice } from "@/domain/pricing/calculatePrice";
import { normalizeServiceIds } from "@/data/catalog/services";

/**
 * The boundary check every repository runs before accepting a request.
 *
 * It exists because a client-side total is not authoritative. The same
 * function is intended to run on the server (a Postgres trigger, an edge
 * function or a Next.js route handler) once one exists — see
 * `supabase/migrations` and docs/round2-productionization.md.
 */

export type QuoteValidationIssue = { field: string; message: string };

export type QuoteValidationResult =
  | { ok: true; request: QuoteRequest }
  | { ok: false; issues: QuoteValidationIssue[] };

/** Difference tolerated between the submitted total and a recomputed one. */
export const TOTAL_TOLERANCE_SAR = 1;

export function validateQuoteRequest(input: unknown): QuoteValidationResult {
  const parsed = quoteRequestSchema.safeParse(input);
  if (!parsed.success) {
    return {
      ok: false,
      issues: parsed.error.issues.map((issue) => ({
        field: issue.path.join("."),
        message: issue.message,
      })),
    };
  }

  const request = parsed.data;
  const issues: QuoteValidationIssue[] = [];

  // A design with an unbuildable combination must never become a lead.
  const validation = evaluateConfiguration(request.configuration);
  if (validation.blocking.length > 0) {
    issues.push({
      field: "configuration",
      message:
        "This configuration contains selections that cannot be built together.",
    });
  }

  // Services must be real, and must be the ones the total was priced with.
  const services = normalizeServiceIds(request.additionalServices);
  if (services.length !== request.additionalServices.length) {
    issues.push({
      field: "additionalServices",
      message: "The request contains an unknown service.",
    });
  }

  // Recompute the estimate rather than trusting the number that arrived.
  const recomputed = calculatePrice(request.configuration, {
    selectedServiceIds: services,
  });
  if (Math.abs(recomputed.total - request.pricing.estimatedTotal) > TOTAL_TOLERANCE_SAR) {
    issues.push({
      field: "pricing.estimatedTotal",
      message: "The submitted total does not match the configuration.",
    });
  }

  if (issues.length > 0) return { ok: false, issues };

  // Store the authoritative figures, not the client's.
  return {
    ok: true,
    request: {
      ...request,
      additionalServices: services,
      status: "new",
      pricing: {
        estimatedTotal: recomputed.total,
        currency: "SAR",
        isEstimate: recomputed.isEstimate,
      },
      validation: { status: validation.status, messages: validation.messages },
    },
  };
}
