import type { QuoteRecord, QuoteRequest } from "@/domain/configuration/schema";

/**
 * The quote transport boundary.
 *
 * The UI depends on this interface only, never on a concrete implementation,
 * so demo and production differ by wiring rather than by component code.
 */
export interface QuoteRepository {
  /** Human label for the storage this repository writes to. */
  readonly kind: "local" | "remote";
  submit(request: QuoteRequest): Promise<QuoteSubmissionResult>;
  getByReference(reference: string): Promise<QuoteRecord | null>;
}

export type QuoteSubmissionResult =
  | {
      ok: true;
      /** Reference confirmed by the store that accepted the request. */
      reference: string;
      /** Where the request actually landed. */
      storedIn: "local" | "remote";
    }
  | {
      ok: false;
      error: QuoteSubmissionError;
    };

export type QuoteSubmissionErrorCode =
  | "validation"
  | "network"
  | "conflict"
  | "rejected"
  | "not_configured"
  | "unknown";

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
