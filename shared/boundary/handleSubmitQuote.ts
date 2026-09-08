import { normalizeServiceIds } from "../catalog/services.ts";
import {
  QUOTE_SCHEMA_VERSION,
  type QuoteRequest,
} from "../configuration/schema.ts";
import { normalizeConfiguration } from "../configuration/normalize.ts";
import { calculatePrice } from "../pricing/calculatePrice.ts";
import { evaluateConfiguration } from "../rules/evaluateConfiguration.ts";
import { createDesignReference } from "../lib/id.ts";
import { findUnknownCatalogIds, findUnknownServiceIds } from "./catalogIntegrity.ts";
import {
  publicQuoteSubmissionSchema,
  STATUS_FOR_CODE,
  type PublicErrorCode,
  type PublicQuoteSubmissionResult,
} from "./publicSubmission.ts";

/**
 * The trusted quote boundary.
 *
 * Runtime-neutral on purpose: every side effect arrives as an injected
 * dependency, so the same code runs inside the Supabase Edge Function and
 * inside the Vitest suite. There is one implementation of the rules and the
 * pricing, and this is the only place a lead is created.
 *
 * The browser never inserts into `quote_requests`; see
 * `supabase/migrations/0002_trusted_boundary.sql`.
 */

/** Row shape handed to the database adapter. */
export type QuoteRow = {
  reference: string;
  submitted_at: string;
  status: "new";
  schema_version: number;
  source: string;
  customer_name: string;
  customer_email: string;
  customer_phone: string;
  customer_city: string;
  preferred_contact: string;
  message: string | null;
  consent: boolean;
  additional_services_json: string[];
  configuration_json: unknown;
  pricing_json: unknown;
  validation_json: unknown;
};

export type InsertOutcome =
  | { ok: true }
  | { ok: false; reason: "duplicate" }
  | { ok: false; reason: "error"; detail?: string };

export type CaptchaOutcome = { ok: true } | { ok: false; detail?: string };
export type RateLimitOutcome = { allowed: true } | { allowed: false; detail?: string };

/** Operational events. Never contains the customer's contact details. */
export type BoundaryLogEvent =
  | { type: "rejected"; code: PublicErrorCode; detail?: string }
  | { type: "inserted"; reference: string }
  | { type: "notify_failed"; reference: string; detail?: string }
  | { type: "insert_failed"; detail?: string };

export type BoundaryDeps = {
  /** Persist the lead. The only writer of `quote_requests`. */
  insertLead: (row: QuoteRow) => Promise<InsertOutcome>;
  /** Injected so tests are deterministic. */
  now?: () => Date;
  createReference?: () => string;
  /** Optional; when absent, captcha verification is skipped. */
  verifyCaptcha?: (token: string | undefined) => Promise<CaptchaOutcome>;
  /** Optional; when absent, no rate limiting is applied. */
  checkRateLimit?: (input: { email: string }) => Promise<RateLimitOutcome>;
  /** Fired only after a confirmed insert. Failure must not lose the lead. */
  notify?: (request: QuoteRequest) => Promise<void>;
  log?: (event: BoundaryLogEvent) => void;
};

export type BoundaryResponse = {
  status: number;
  body: PublicQuoteSubmissionResult;
};

function fail(
  code: PublicErrorCode,
  message: string,
  log?: BoundaryDeps["log"],
  detail?: string,
): BoundaryResponse {
  log?.({ type: "rejected", code, detail });
  return { status: STATUS_FOR_CODE[code], body: { ok: false, error: { code, message } } };
}

export async function handleSubmitQuote(
  payload: unknown,
  deps: BoundaryDeps,
): Promise<BoundaryResponse> {
  const now = deps.now ?? (() => new Date());
  const createReference = deps.createReference ?? createDesignReference;
  const log = deps.log;

  // 1. Shape. Anything the client sends beyond this contract is ignored,
  //    including any price or validation result it might try to supply.
  const parsed = publicQuoteSubmissionSchema.safeParse(payload);
  if (!parsed.success) {
    return fail(
      "validation",
      firstMessage(parsed.error.issues) ?? "The request could not be validated.",
      log,
      JSON.stringify(parsed.error.issues).slice(0, 500),
    );
  }
  const submission = parsed.data;

  // 2. Anti-spam, before any work is done on the payload.
  if (deps.verifyCaptcha) {
    const captcha = await deps.verifyCaptcha(submission.antiSpam?.turnstileToken);
    if (!captcha.ok) {
      return fail(
        "captcha_failed",
        "We could not verify that this request came from a person. Please reload and try again.",
        log,
        captcha.detail,
      );
    }
  }

  if (deps.checkRateLimit) {
    const rate = await deps.checkRateLimit({ email: submission.customer.email });
    if (!rate.allowed) {
      return fail(
        "rate_limited",
        "Too many requests from this address. Please wait a few minutes and try again.",
        log,
        rate.detail,
      );
    }
  }

  // 3. Unknown catalog ids are rejected outright, and checked against the
  //    payload *as submitted*. Normalisation would quietly drop an invented id
  //    from a list field, and the rules engine cannot see one either, because
  //    unknown lookups return undefined and get filtered away. Silently
  //    cleaning a hostile payload is worse than refusing it.
  const unknownItems = findUnknownCatalogIds(submission.configuration);
  if (unknownItems.length > 0) {
    return fail(
      "configuration_rejected",
      "This design references options that do not exist.",
      log,
      `unknown items: ${unknownItems.join(", ")}`,
    );
  }

  const unknownServices = findUnknownServiceIds(submission.selectedServiceIds);
  if (unknownServices.length > 0) {
    return fail(
      "configuration_rejected",
      "This request references a service that does not exist.",
      log,
      `unknown services: ${unknownServices.join(", ")}`,
    );
  }

  // Only now is it safe to normalise: the ids are all real.
  const configuration = normalizeConfiguration(submission.configuration);

  // 4. Rules. `incompatible` blocks; `review_required` is allowed through,
  //    because a review request is precisely what a quote initiates.
  const validation = evaluateConfiguration(configuration);
  if (validation.blocking.length > 0) {
    return fail(
      "configuration_rejected",
      "This design contains selections that cannot be built together.",
      log,
      validation.blocking.map((message) => message.code).join(", "),
    );
  }

  // 5–7. Services, price and validation snapshot are all produced here.
  const selectedServiceIds = normalizeServiceIds(submission.selectedServiceIds);
  const pricing = calculatePrice(configuration, { selectedServiceIds });

  const submittedAt = now().toISOString();
  const reference = submission.reference ?? createReference();

  const request: QuoteRequest = {
    reference,
    submittedAt,
    schemaVersion: QUOTE_SCHEMA_VERSION,
    status: "new",
    source: submission.source,
    customer: submission.customer,
    additionalServices: selectedServiceIds,
    configuration,
    pricing: {
      estimatedTotal: pricing.total,
      currency: "SAR",
      isEstimate: pricing.isEstimate,
    },
    validation: { status: validation.status, messages: validation.messages },
  };

  // 8. Create the row.
  const inserted = await deps.insertLead(toRow(request));
  if (!inserted.ok) {
    if (inserted.reason === "duplicate") {
      return fail(
        "duplicate",
        "That design reference has already been submitted.",
        log,
      );
    }
    log?.({ type: "insert_failed", detail: inserted.detail });
    return fail(
      "server_error",
      "We could not save your request. Please try again in a moment.",
      log,
      inserted.detail,
    );
  }
  log?.({ type: "inserted", reference });

  // 9. Notify only after the lead is durable, and never let it fail the lead.
  if (deps.notify) {
    try {
      await deps.notify(request);
    } catch (error) {
      log?.({
        type: "notify_failed",
        reference,
        detail: error instanceof Error ? error.message : String(error),
      });
    }
  }

  // 10. The response carries no personal data — only what confirms receipt.
  return {
    status: 201,
    body: { ok: true, reference, submittedAt, status: "new" },
  };
}

export function toRow(request: QuoteRequest): QuoteRow {
  return {
    reference: request.reference,
    submitted_at: request.submittedAt,
    status: "new",
    schema_version: request.schemaVersion,
    source: request.source,
    customer_name: request.customer.fullName,
    customer_email: request.customer.email,
    customer_phone: request.customer.phone,
    customer_city: request.customer.city,
    preferred_contact: request.customer.preferredContact,
    message: request.customer.message ?? null,
    consent: request.customer.consent,
    additional_services_json: request.additionalServices,
    configuration_json: request.configuration,
    pricing_json: request.pricing,
    validation_json: request.validation,
  };
}

function firstMessage(issues: { message: string }[]): string | undefined {
  return issues[0]?.message;
}
