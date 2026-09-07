import { STORAGE_KEYS } from "@/constants/brand";
import {
  quoteRequestSchema,
  toQuoteRecord,
  type QuoteRecord,
  type QuoteRequest,
} from "@/domain/configuration/schema";
import { readJson, writeJson } from "@/lib/storage";
import { validateQuoteRequest } from "./validation";
import {
  submissionError,
  type QuoteRepository,
  type QuoteSubmissionResult,
} from "./types";

/**
 * Demo repository: writes to the visitor's own browser, and nowhere else.
 *
 * Nothing here reaches Nature Vibes. Every screen that uses it must say so —
 * see `IS_DEMO` in the quote and success steps.
 */
export class LocalDemoQuoteRepository implements QuoteRepository {
  readonly kind = "local" as const;

  async submit(request: QuoteRequest): Promise<QuoteSubmissionResult> {
    // The demo path runs the same boundary validation as production, so a
    // request that would be rejected remotely is rejected here too.
    const validated = validateQuoteRequest(request);
    if (!validated.ok) {
      return submissionError(
        "validation",
        validated.issues[0]?.message ?? "This request could not be validated.",
        { detail: JSON.stringify(validated.issues) },
      );
    }

    const stored = this.readAll();
    if (stored.some((entry) => entry.reference === validated.request.reference)) {
      return submissionError("conflict", "That reference already exists.", {
        retryable: true,
      });
    }

    const written = writeJson(STORAGE_KEYS.quotes, [validated.request, ...stored]);
    if (!written) {
      return submissionError(
        "unknown",
        "This browser would not let the demo request be saved. Private browsing " +
          "or blocked site data is the usual cause.",
        { retryable: true },
      );
    }

    return { ok: true, reference: validated.request.reference, storedIn: "local" };
  }

  async getByReference(reference: string): Promise<QuoteRecord | null> {
    const match = this.readAll().find((entry) => entry.reference === reference);
    return match ? toQuoteRecord(match) : null;
  }

  /** The full local request, including contact details — the visitor's own data. */
  getFullByReference(reference: string): QuoteRequest | null {
    return this.readAll().find((entry) => entry.reference === reference) ?? null;
  }

  private readAll(): QuoteRequest[] {
    const raw = readJson<unknown[]>(STORAGE_KEYS.quotes) ?? [];
    return raw
      .map((entry) => quoteRequestSchema.safeParse(entry))
      .filter((result) => result.success)
      .map((result) => result.data);
  }
}
