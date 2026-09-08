import type { QuoteRecord } from "../configuration/schema.ts";
import type { PublicQuoteSubmission } from "../boundary/publicSubmission.ts";

/**
 * The quote transport boundary.
 *
 * Round 2.1 changed `submit` to take a `PublicQuoteSubmission` rather than a
 * finished `QuoteRequest`: the client no longer supplies a price or a
 * validation result, so there is nothing for it to get wrong or to tamper
 * with. Both implementations run the same trusted handler — the remote one
 * across the network, the demo one in-process.
 */
export interface QuoteRepository {
  readonly kind: "local" | "remote";
  submit(submission: PublicQuoteSubmission): Promise<QuoteSubmissionResult>;
  getByReference(reference: string): Promise<QuoteRecord | null>;
}

export type QuoteSubmissionResult =
  | {
      ok: true;
      /** Reference confirmed by whatever accepted the request. */
      reference: string;
      /** Timestamp assigned by the trusted boundary, not the browser. */
      submittedAt: string;
      storedIn: "local" | "remote";
    }
  | { ok: false; error: QuoteSubmissionError };

export type QuoteSubmissionErrorCode =
  | "validation"
  | "configuration_rejected"
  | "duplicate"
  | "rate_limited"
  | "captcha_failed"
  | "network"
  | "not_configured"
  | "server_error";

export type QuoteSubmissionError = {
  code: QuoteSubmissionErrorCode;
  /** Text safe to show to the customer. */
  message: string;
  /** Whether trying again could plausibly succeed. */
  retryable: boolean;
  /** Diagnostic detail for logs; never rendered. */
  detail?: string;
};

export function submissionError(
  code: QuoteSubmissionErrorCode,
  message: string,
  options: { retryable?: boolean; detail?: string } = {},
): QuoteSubmissionResult {
  return {
    ok: false,
    error: {
      code,
      message,
      retryable: options.retryable ?? false,
      detail: options.detail,
    },
  };
}

/** Whether a customer should be invited to press the button again. */
export const RETRYABLE_CODES: ReadonlySet<QuoteSubmissionErrorCode> = new Set([
  "network",
  "server_error",
  "rate_limited",
  "duplicate",
]);
