import {
  quoteRecordSchema,
  type QuoteRecord,
  type QuoteRequest,
} from "@/domain/configuration/schema";
import { validateQuoteRequest } from "./validation";
import {
  submissionError,
  type QuoteRepository,
  type QuoteSubmissionResult,
} from "./types";

/**
 * Production repository, backed by Supabase/Postgres over PostgREST.
 *
 * Deliberately dependency-free: plain `fetch` keeps the static bundle small,
 * keeps the app deployable to any static host, and makes the transport
 * trivially mockable in tests.
 *
 * Security lives in the database, not here — see
 * `supabase/migrations/0001_quote_requests.sql`:
 *  - anon may INSERT a row with status 'new' and nothing else;
 *  - anon may NOT SELECT the table, so contact details are never readable
 *    with a guessed reference;
 *  - reads go through `get_quote_summary()`, which returns confirmation
 *    fields and the configuration snapshot but no personal data.
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
const TABLE = "quote_requests";
const SUMMARY_RPC = "get_quote_summary";

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

  async submit(request: QuoteRequest): Promise<QuoteSubmissionResult> {
    if (!this.url || !this.anonKey) {
      return submissionError(
        "not_configured",
        "The quote service is not configured for this deployment.",
      );
    }

    const validated = validateQuoteRequest(request);
    if (!validated.ok) {
      return submissionError(
        "validation",
        validated.issues[0]?.message ?? "This request could not be validated.",
        { detail: JSON.stringify(validated.issues) },
      );
    }

    try {
      const response = await this.request(`/rest/v1/${TABLE}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Prefer: "return=representation",
        },
        body: JSON.stringify([toRow(validated.request)]),
      });

      if (response.status === 409) {
        return submissionError(
          "conflict",
          "That design reference has already been submitted.",
          { retryable: true },
        );
      }

      if (!response.ok) {
        const detail = await safeText(response);
        // 401/403 mean the RLS policy or key is wrong — retrying will not help.
        const retryable = response.status >= 500;
        return submissionError(
          retryable ? "network" : "rejected",
          retryable
            ? "The quote service is temporarily unavailable. Please try again."
            : "The quote service rejected this request. Please contact us directly.",
          { retryable, detail: `${response.status} ${detail}` },
        );
      }

      // Only a confirmed write counts as success.
      const rows = (await response.json()) as { reference?: string }[];
      const reference = rows?.[0]?.reference ?? validated.request.reference;
      return { ok: true, reference, storedIn: "remote" };
    } catch (error) {
      return submissionError(
        "network",
        "We could not reach the quote service. Check your connection and try again.",
        { retryable: true, detail: describe(error) },
      );
    }
  }

  async getByReference(reference: string): Promise<QuoteRecord | null> {
    if (!this.url || !this.anonKey) return null;

    try {
      const response = await this.request(`/rest/v1/rpc/${SUMMARY_RPC}`, {
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

/** Map the request onto the table's columns. */
function toRow(request: QuoteRequest) {
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

function describe(error: unknown): string {
  return error instanceof Error ? `${error.name}: ${error.message}` : String(error);
}
