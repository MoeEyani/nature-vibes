import { beforeEach, describe, expect, it, vi } from "vitest";
import { clearStorage } from "./setup";
import { STORAGE_KEYS } from "@/constants/brand";
import {
  LocalDemoQuoteRepository,
  RemoteQuoteRepository,
  setQuoteRepository,
} from "@/domain/quotes";
import { SUBMIT_FUNCTION_PATH } from "@/domain/quotes/supabaseRepository";
import type {
  QuoteRepository,
  QuoteSubmissionResult,
} from "@shared/quotes/types";
import type { PublicQuoteSubmission } from "@shared/boundary/publicSubmission";
import { calculatePrice } from "@shared/pricing/calculatePrice";
import { evaluateConfiguration } from "@shared/rules/evaluateConfiguration";
import {
  QUOTE_SCHEMA_VERSION,
  quoteCustomerSchema,
  type QuoteCustomer,
  type QuoteRequest,
} from "@shared/configuration/schema";
import { useConfiguratorStore } from "@/store/useConfiguratorStore";
import { AQUARIUM_1200, configure } from "./helpers";

const CUSTOMER: QuoteCustomer = {
  fullName: "Test Customer",
  email: "test@example.com",
  phone: "+966 50 123 4567",
  city: "Riyadh",
  preferredContact: "email",
  message: "Please include delivery.",
  consent: true,
};

function buildSubmission(
  overrides: Partial<PublicQuoteSubmission> = {},
): PublicQuoteSubmission {
  return {
    schemaVersion: QUOTE_SCHEMA_VERSION,
    reference: "NV-TEST-0001",
    customer: CUSTOMER,
    configuration: configure(),
    selectedServiceIds: ["SVC-DELIVERY"],
    source: "web-configurator",
    ...overrides,
  };
}

/** Reset the store and browser storage between tests. */
function resetApp(): void {
  clearStorage();
  setQuoteRepository(null);
  useConfiguratorStore.setState({
    hydrated: false,
    lastQuote: null,
    reference: null,
    visited: [],
  });
  useConfiguratorStore.getState().startNewDesign();
}

beforeEach(resetApp);

describe("customer form validation", () => {
  it("requires consent before a request can be built", () => {
    const parsed = quoteCustomerSchema.safeParse({ ...CUSTOMER, consent: false });
    expect(parsed.success).toBe(false);
  });

  it('rejects the literal word "Other" as a city', () => {
    // Picking "Other" must reveal a free-text field that captures a real place.
    const parsed = quoteCustomerSchema.safeParse({ ...CUSTOMER, city: "Other" });
    expect(parsed.success).toBe(false);
    expect(
      quoteCustomerSchema.safeParse({ ...CUSTOMER, city: "Abha" }).success,
    ).toBe(true);
  });

  it("rejects an empty free-text city", () => {
    expect(quoteCustomerSchema.safeParse({ ...CUSTOMER, city: "" }).success).toBe(
      false,
    );
  });
});

describe("LocalDemoQuoteRepository", () => {
  it("stores the request in this browser and reads it back", async () => {
    const repo = new LocalDemoQuoteRepository();
    const result = await repo.submit(buildSubmission());
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.storedIn).toBe("local");

    const found = await repo.getByReference("NV-TEST-0001");
    expect(found?.reference).toBe("NV-TEST-0001");
    // The demo repository runs the same trusted handler, so the stored total
    // is the one the shared pricing code produced.
    expect(found?.estimatedTotal).toBeGreaterThan(0);
  });

  it("does not expose contact details through getByReference", async () => {
    const repo = new LocalDemoQuoteRepository();
    await repo.submit(buildSubmission());

    const record = await repo.getByReference("NV-TEST-0001");
    expect(record).not.toBeNull();
    expect(JSON.stringify(record)).not.toContain("test@example.com");
  });

  it("returns null for an unknown reference", async () => {
    const repo = new LocalDemoQuoteRepository();
    expect(await repo.getByReference("NV-ZZZZ-ZZZZ")).toBeNull();
  });

  it("refuses a duplicate reference", async () => {
    const repo = new LocalDemoQuoteRepository();
    await repo.submit(buildSubmission());
    const second = await repo.submit(buildSubmission());
    expect(second.ok).toBe(false);
    if (!second.ok) expect(second.error.code).toBe("duplicate");
  });
});

describe("RemoteQuoteRepository", () => {
  function repoWith(fetchImpl: typeof fetch) {
    return new RemoteQuoteRepository({
      url: "https://example.supabase.co",
      anonKey: "anon-key",
      fetchImpl,
    });
  }

  it("posts to the trusted Edge Function, never to the table", async () => {
    const calls: string[] = [];
    const fetchImpl = vi.fn(async (url: string) => {
      calls.push(String(url));
      return new Response(
        JSON.stringify({
          ok: true,
          reference: "NV-TEST-0001",
          submittedAt: "2026-09-08T00:00:00.000Z",
          status: "new",
        }),
        { status: 201 },
      );
    }) as unknown as typeof fetch;

    const result = await repoWith(fetchImpl).submit(buildSubmission());

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.storedIn).toBe("remote");
      // The timestamp is the boundary's, not the browser's.
      expect(result.submittedAt).toBe("2026-09-08T00:00:00.000Z");
    }

    expect(calls[0]).toContain(SUBMIT_FUNCTION_PATH);
    // Anonymous INSERT is revoked by migration 0002; nothing may go there.
    expect(calls.some((url) => url.includes("/rest/v1/quote_requests"))).toBe(false);
  });

  it("sends no price or validation result in the body", async () => {
    let body = "";
    const fetchImpl = vi.fn(async (_url: string, init: RequestInit) => {
      body = String(init.body ?? "");
      return new Response(
        JSON.stringify({
          ok: true,
          reference: "NV-TEST-0001",
          submittedAt: "2026-09-08T00:00:00.000Z",
          status: "new",
        }),
        { status: 201 },
      );
    }) as unknown as typeof fetch;

    await repoWith(fetchImpl).submit(buildSubmission());

    const parsed = JSON.parse(body);
    expect(parsed.pricing).toBeUndefined();
    expect(parsed.validation).toBeUndefined();
    expect(parsed.selectedServiceIds).toEqual(["SVC-DELIVERY"]);
  });

  it("does not report success when the endpoint answers with ok:false", async () => {
    const fetchImpl = vi.fn(async () =>
      new Response(JSON.stringify({ ok: false }), { status: 200 }),
    ) as unknown as typeof fetch;

    const result = await repoWith(fetchImpl).submit(buildSubmission());
    expect(result.ok).toBe(false);
  });

  it("surfaces a 400 as a non-retryable validation failure", async () => {
    const fetchImpl = vi.fn(async () =>
      new Response(
        JSON.stringify({
          ok: false,
          error: { code: "configuration_rejected", message: "Cannot be built together." },
        }),
        { status: 400 },
      ),
    ) as unknown as typeof fetch;

    const result = await repoWith(fetchImpl).submit(buildSubmission());
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.retryable).toBe(false);
      // The boundary's own wording reaches the customer.
      expect(result.error.message).toBe("Cannot be built together.");
    }
  });

  it("surfaces a 409 duplicate", async () => {
    const fetchImpl = vi.fn(async () =>
      new Response(JSON.stringify({ ok: false, error: { code: "duplicate" } }), {
        status: 409,
      }),
    ) as unknown as typeof fetch;

    const result = await repoWith(fetchImpl).submit(buildSubmission());
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error.code).toBe("duplicate");
  });

  it("surfaces a 429 rate limit as retryable", async () => {
    const fetchImpl = vi.fn(async () =>
      new Response(JSON.stringify({ ok: false, error: { code: "rate_limited" } }), {
        status: 429,
      }),
    ) as unknown as typeof fetch;

    const result = await repoWith(fetchImpl).submit(buildSubmission());
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.code).toBe("rate_limited");
      expect(result.error.retryable).toBe(true);
    }
  });

  it("surfaces a 403 captcha failure", async () => {
    const fetchImpl = vi.fn(async () =>
      new Response(JSON.stringify({ ok: false, error: { code: "captcha_failed" } }), {
        status: 403,
      }),
    ) as unknown as typeof fetch;

    const result = await repoWith(fetchImpl).submit(buildSubmission());
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error.code).toBe("captcha_failed");
  });

  it("treats a timeout as a retryable network failure", async () => {
    const fetchImpl = vi.fn(async () => {
      const error = new Error("aborted");
      error.name = "AbortError";
      throw error;
    }) as unknown as typeof fetch;

    const result = await repoWith(fetchImpl).submit(buildSubmission());
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.code).toBe("network");
      expect(result.error.retryable).toBe(true);
      expect(result.error.message).toMatch(/took too long/i);
    }
  });

  it("reports a retryable failure on a 5xx", async () => {
    const fetchImpl = vi.fn(async () =>
      new Response("boom", { status: 503 }),
    ) as unknown as typeof fetch;

    const result = await repoWith(fetchImpl).submit(buildSubmission());
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.retryable).toBe(true);
      expect(result.error.code).toBe("server_error");
    }
  });

  it("treats a thrown network error as retryable", async () => {
    const fetchImpl = vi.fn(async () => {
      throw new Error("offline");
    }) as unknown as typeof fetch;

    const result = await repoWith(fetchImpl).submit(buildSubmission());
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error.retryable).toBe(true);
  });

  it("refuses to submit when credentials are missing", async () => {
    const repo = new RemoteQuoteRepository({ url: "", anonKey: "" });
    const result = await repo.submit(buildSubmission());
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error.code).toBe("not_configured");
  });

  it("still reads back through the safe summary RPC", async () => {
    const fetchImpl = vi.fn(async () =>
      new Response(
        JSON.stringify([
          {
            reference: "NV-TEST-0001",
            submitted_at: "2026-09-07T12:00:00.000Z",
            status: "new",
            pricing_json: { estimatedTotal: 1234, currency: "SAR", isEstimate: true },
            validation_status: "review_required",
            additional_services_json: ["SVC-DELIVERY"],
          },
        ]),
        { status: 200 },
      ),
    ) as unknown as typeof fetch;

    const record = await repoWith(fetchImpl).getByReference("NV-TEST-0001");
    expect(record?.reference).toBe("NV-TEST-0001");
    expect(record?.estimatedTotal).toBe(1234);
    expect(record?.validationStatus).toBe("review_required");
  });
});

describe("store submission", () => {
  /** A repository that always fails, standing in for a broken backend. */
  const failing: QuoteRepository = {
    kind: "remote",
    async submit(): Promise<QuoteSubmissionResult> {
      return {
        ok: false,
        error: {
          code: "network",
          message: "The quote service is unavailable.",
          retryable: true,
        },
      };
    },
    async getByReference() {
      return null;
    },
  };

  it("records the quote after a successful demo submission", async () => {
    setQuoteRepository(new LocalDemoQuoteRepository());
    const store = useConfiguratorStore.getState();

    const result = await store.submitQuote({ customer: CUSTOMER });
    expect(result.ok).toBe(true);

    const after = useConfiguratorStore.getState();
    expect(after.lastQuote).not.toBeNull();
    expect(after.reference).toBe(after.lastQuote?.reference);
  });

  it("does not record success when the repository fails", async () => {
    setQuoteRepository(failing);
    const store = useConfiguratorStore.getState();

    const result = await store.submitQuote({ customer: CUSTOMER });
    expect(result.ok).toBe(false);

    // Nothing may claim the request was received.
    const after = useConfiguratorStore.getState();
    expect(after.lastQuote).toBeNull();
    expect(after.reference).toBeNull();
    expect(window.localStorage.getItem(STORAGE_KEYS.quotes)).toBeNull();
  });

  it("submits exactly the services the estimate was priced with", async () => {
    setQuoteRepository(new LocalDemoQuoteRepository());
    const store = useConfiguratorStore.getState();

    store.setServices(["SVC-DELIVERY", "SVC-MAINTENANCE"]);
    const selected = useConfiguratorStore.getState().selectedServiceIds;
    const expected = calculatePrice(useConfiguratorStore.getState().config, {
      selectedServiceIds: selected,
    });

    const result = await store.submitQuote({ customer: CUSTOMER });
    expect(result.ok).toBe(true);

    const quote = useConfiguratorStore.getState().lastQuote!;
    expect(quote.additionalServices).toEqual(selected);
    expect(quote.pricing.estimatedTotal).toBe(expected.total);
  });

  it("blocks submission of an incompatible design", async () => {
    setQuoteRepository(new LocalDemoQuoteRepository());
    const store = useConfiguratorStore.getState();

    // Ceiling fan under an open pergola roof.
    store.setRoof("ROOF-PERGOLA");
    store.toggleAddon("ADD-FAN");
    expect(
      evaluateConfiguration(useConfiguratorStore.getState().config).canRequestQuote,
    ).toBe(false);

    const result = await store.submitQuote({ customer: CUSTOMER });
    expect(result.ok).toBe(false);
    expect(useConfiguratorStore.getState().lastQuote).toBeNull();
  });

  it("allows submission of a review-required design", async () => {
    setQuoteRepository(new LocalDemoQuoteRepository());
    const store = useConfiguratorStore.getState();

    store.setEnvironment("ENV-ROOFTOP");
    store.setAquariumEnabled(true);
    expect(
      evaluateConfiguration(useConfiguratorStore.getState().config).status,
    ).toBe("review_required");

    const result = await store.submitQuote({ customer: CUSTOMER });
    expect(result.ok).toBe(true);
  });

  it("restores a submitted request by reference, as the success page does", async () => {
    const repository = new LocalDemoQuoteRepository();
    setQuoteRepository(repository);

    const result = await useConfiguratorStore.getState().submitQuote({
      customer: CUSTOMER,
    });
    expect(result.ok).toBe(true);
    const reference = result.ok ? result.reference : "";

    // Simulate a reload: the in-memory quote is gone, the URL still has ?ref.
    useConfiguratorStore.setState({ lastQuote: null, reference: null });

    const restored = await repository.getByReference(reference);
    expect(restored?.reference).toBe(reference);
    expect(restored?.configuration).toBeDefined();
  });
});
