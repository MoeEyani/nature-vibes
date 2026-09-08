import type { PublicQuoteSubmission } from "@shared/boundary/publicSubmission";
import {
  quoteRecordSchema,
  type QuoteRecord,
} from "@shared/configuration/schema";
import {
  submissionError,
  type QuoteRepository,
  type QuoteSubmissionErrorCode,
  type QuoteSubmissionResult,
} from "@shared/quotes/types";

/**
 * Production repository.
 *
 * Round 2.1: this no longer inserts into `quote_requests`. It posts to the
 * `submit-quote` Edge Function, which validates with the shared domain code,
 * prices the design itself and writes with the service role. Anonymous INSERT
 * on the table is revoked by migration 0002, so this is the only route in.
 *
 * Dependency-free on purpose: plain `fetch` keeps the static bundle small,
 * keeps the app deployable to any static host, and makes the transport
 * trivially mockable in tests.
 */

export type FetchLike = typeof fetch;

export type SupabaseRepositoryOptions = {
  url: string;
  anonKey: string;
  /** Injectable for tests. */
  fetchImpl?: FetchLike;
  /** Abort a hanging request rather than leaving the customer waiting. */
  timeoutMs?: number;
};

const DEFAULT_TIMEOUT_MS = 15_000;
export const SUBMIT_FUNCTION_PATH = "/functions/v1/submit-quote";
const SUMMARY_RPC = "/rest/v1/rpc/get_quote_summary";

/** Errors the boundary returns, mapped to how the UI should treat them. */
const ERROR_BY_STATUS: Record<
  number,
  { code: QuoteSubmissionErrorCode; retryable: boolean; message: string }
> = {
  400: {
    code: "validation",
    retryable: false,
    message: "Some details in this request were not accepted. Please review the form.",
  },
  403: {
    code: "captcha_failed",
    retryable: true,
    message:
      "We could not verify that this request came from a person. Please reload the page and try again.",
  },
  409: {
    code: "duplicate",
    retryable: true,
    message: "That design reference has already been submitted.",
  },
  429: {
    code: "rate_limited",
    retryable: true,
    message: "Too many requests from this address. Please wait a few minutes and try again.",
  },
};

export class RemoteQuoteRepository implements QuoteRepository {
  readonly kind = "remote" as const;

  private readonly url: string;
  private readonly anonKey: string;
  private readonly fetchImpl: FetchLike;
  private readonly timeoutMs: number;

  constructor(options: SupabaseRepositoryOptions) {
    this.url = options.url.replace(/\/+$/, "");
    this.anonKey = options.anonKey;
    this.fetchImpl = options.fetchImpl ?? globalThis.fetch.bind(globalThis);
    this.timeoutMs = options.timeoutMs ?? DEFAULT_TIMEOUT_MS;
  }

  async submit(submission: PublicQuoteSubmission): Promise<QuoteSubmissionResult> {
    if (!this.url || !this.anonKey) {
      return submissionError(
        "not_configured",
        "The quote service is not configured for this deployment.",
      );
    }

    try {
      const response = await this.request(SUBMIT_FUNCTION_PATH, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(submission),
      });

      if (response.ok) {
        // Only a confirmed write counts. The reference and timestamp are the
        // boundary's, not the browser's.
        const body = (await response.json()) as {
          ok?: boolean;
          reference?: string;
          submittedAt?: string;
        };
        if (!body?.ok || !body.reference) {
          return submissionError(
            "server_error",
            "The quote service returned an unexpected response. Please try again.",
            { retryable: true, detail: JSON.stringify(body).slice(0, 300) },
          );
        }
        return {
          ok: true,
          reference: body.reference,
          submittedAt: body.submittedAt ?? new Date().toISOString(),
          storedIn: "remote",
        };
      }

      const known = ERROR_BY_STATUS[response.status];
      const detail = await safeText(response);

      if (known) {
        // Prefer the boundary's own message when it supplied one.
        const message = (await safeMessage(detail)) ?? known.message;
        return submissionError(known.code, message, {
          retryable: known.retryable,
          detail: `${response.status} ${detail}`,
        });
      }

      const retryable = response.status >= 500;
      return submissionError(
        retryable ? "server_error" : "validation",
        retryable
          ? "The quote service is temporarily unavailable. Please try again."
          : "The quote service rejected this request. Please contact us directly.",
        { retryable, detail: `${response.status} ${detail}` },
      );
    } catch (error) {
      const aborted = error instanceof Error && error.name === "AbortError";
      return submissionError(
        "network",
        aborted
          ? "The quote service took too long to respond. Please try again."
          : "We could not reach the quote service. Check your connection and try again.",
        { retryable: true, detail: describe(error) },
      );
    }
  }

  /**
   * Reads still go through the safe summary RPC, which returns confirmation
   * fields and the configuration but no personal data — a design reference
   * must never be a key to somebody's contact details.
   */
  async getByReference(reference: string): Promise<QuoteRecord | null> {
    if (!this.url || !this.anonKey) return null;

    try {
      const response = await this.request(SUMMARY_RPC, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ p_reference: reference }),
      });
      if (!response.ok) return null;

      const payload = await response.json();
      const row = Array.isArray(payload) ? payload[0] : payload;
      if (!row) return null;

      const parsed = quoteRecordSchema.safeParse(fromSummaryRow(row));
      return parsed.success ? parsed.data : null;
    } catch {
      return null;
    }
  }

  private async request(path: string, init: RequestInit): Promise<Response> {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), this.timeoutMs);
    try {
      return await this.fetchImpl(`${this.url}${path}`, {
        ...init,
        signal: controller.signal,
        headers: {
          apikey: this.anonKey,
          Authorization: `Bearer ${this.anonKey}`,
          ...(init.headers ?? {}),
        },
      });
    } finally {
      clearTimeout(timer);
    }
  }
}

type SummaryRow = {
  reference: string;
  submitted_at: string;
  status: string;
  pricing_json?: { estimatedTotal?: number; currency?: string; isEstimate?: boolean };
  validation_status?: string;
  additional_services_json?: string[];
  configuration_json?: unknown;
};

function fromSummaryRow(row: SummaryRow) {
  return {
    reference: row.reference,
    submittedAt: row.submitted_at,
    status: row.status,
    estimatedTotal: row.pricing_json?.estimatedTotal ?? 0,
    currency: row.pricing_json?.currency ?? "SAR",
    isEstimate: row.pricing_json?.isEstimate ?? true,
    validationStatus: row.validation_status ?? "warning",
    additionalServices: row.additional_services_json ?? [],
    configuration: row.configuration_json,
  };
}

async function safeText(response: Response): Promise<string> {
  try {
    return (await response.text()).slice(0, 500);
  } catch {
    return "";
  }
}

/** Pull the boundary's customer-safe message out of an error body. */
async function safeMessage(body: string): Promise<string | null> {
  try {
    const parsed = JSON.parse(body) as { error?: { message?: string } };
    return parsed?.error?.message ?? null;
  } catch {
    return null;
  }
}

function describe(error: unknown): string {
  return error instanceof Error ? `${error.name}: ${error.message}` : String(error);
}
