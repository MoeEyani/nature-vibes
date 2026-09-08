import { STORAGE_KEYS } from "@/constants/brand";
import {
  handleSubmitQuote,
  type InsertOutcome,
  type QuoteRow,
} from "@shared/boundary/handleSubmitQuote";
import type { PublicQuoteSubmission } from "@shared/boundary/publicSubmission";
import {
  quoteRequestSchema,
  toQuoteRecord,
  type QuoteRecord,
  type QuoteRequest,
} from "@shared/configuration/schema";
import {
  submissionError,
  type QuoteRepository,
  type QuoteSubmissionResult,
} from "@shared/quotes/types";
import { readJson, writeJson } from "@/lib/storage";

/**
 * Demo repository: writes to the visitor's own browser, and nowhere else.
 *
 * It runs the *same* trusted handler the Edge Function runs, with
 * localStorage standing in for Postgres. That is deliberate: demo mode is
 * then a faithful rehearsal of production validation rather than a laxer
 * parallel path, and the boundary gets exercised by every demo test.
 *
 * Nothing here reaches Nature Vibes. Every screen that uses it says so.
 */
export class LocalDemoQuoteRepository implements QuoteRepository {
  readonly kind = "local" as const;

  async submit(submission: PublicQuoteSubmission): Promise<QuoteSubmissionResult> {
    const result = await handleSubmitQuote(submission, {
      insertLead: (row) => this.insert(row),
    });

    if (result.body.ok) {
      return {
        ok: true,
        reference: result.body.reference,
        submittedAt: result.body.submittedAt,
        storedIn: "local",
      };
    }

    const { code, message } = result.body.error;
    return submissionError(code, message, {
      retryable: code === "duplicate" || code === "server_error",
    });
  }

  async getByReference(reference: string): Promise<QuoteRecord | null> {
    const match = this.readAll().find((entry) => entry.reference === reference);
    return match ? toQuoteRecord(match) : null;
  }

  /** The full local request, including contact details — the visitor's own data. */
  getFullByReference(reference: string): QuoteRequest | null {
    return this.readAll().find((entry) => entry.reference === reference) ?? null;
  }

  /** localStorage in the role the database plays in production. */
  private async insert(row: QuoteRow): Promise<InsertOutcome> {
    const stored = this.readAll();
    if (stored.some((entry) => entry.reference === row.reference)) {
      return { ok: false, reason: "duplicate" };
    }

    const request = rowToRequest(row);
    const written = writeJson(STORAGE_KEYS.quotes, [request, ...stored]);
    return written
      ? { ok: true }
      : {
          ok: false,
          reason: "error",
          detail: "localStorage refused the write (private browsing?)",
        };
  }

  private readAll(): QuoteRequest[] {
    const raw = readJson<unknown[]>(STORAGE_KEYS.quotes) ?? [];
    return raw
      .map((entry) => quoteRequestSchema.safeParse(entry))
      .filter((result) => result.success)
      .map((result) => result.data);
  }
}

/** Invert `toRow`, so what is stored locally matches the production row. */
function rowToRequest(row: QuoteRow): QuoteRequest {
  return {
    reference: row.reference,
    submittedAt: row.submitted_at,
    schemaVersion: row.schema_version as 1,
    status: "new",
    source: row.source,
    customer: {
      fullName: row.customer_name,
      email: row.customer_email,
      phone: row.customer_phone,
      city: row.customer_city,
      preferredContact: row.preferred_contact as "email" | "phone" | "whatsapp",
      message: row.message ?? undefined,
      consent: row.consent,
    },
    additionalServices: row.additional_services_json,
    configuration: row.configuration_json as QuoteRequest["configuration"],
    pricing: row.pricing_json as QuoteRequest["pricing"],
    validation: row.validation_json as QuoteRequest["validation"],
  };
}
