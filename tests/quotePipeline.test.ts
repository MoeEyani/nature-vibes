import { beforeEach, describe, expect, it, vi } from "vitest";
import { clearStorage } from "./setup";
import { STORAGE_KEYS } from "@/constants/brand";
import {
  LocalDemoQuoteRepository,
  RemoteQuoteRepository,
  setQuoteRepository,
  validateQuoteRequest,
  buildNotificationPayload,
  type QuoteRepository,
  type QuoteSubmissionResult,
} from "@/domain/quotes";
import { calculatePrice } from "@/domain/pricing/calculatePrice";
import { evaluateConfiguration } from "@/domain/rules/evaluateConfiguration";
import {
  QUOTE_SCHEMA_VERSION,
  quoteCustomerSchema,
  type QuoteCustomer,
  type QuoteRequest,
} from "@/domain/configuration/schema";
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

function buildRequest(overrides: Partial<QuoteRequest> = {}): QuoteRequest {
  const configuration = overrides.configuration ?? configure();
  const services = overrides.additionalServices ?? ["SVC-DELIVERY"];
  const breakdown = calculatePrice(configuration, { selectedServiceIds: services });
  const validation = evaluateConfiguration(configuration);

  return {
    reference: "NV-TEST-0001",
    submittedAt: new Date().toISOString(),
    schemaVersion: QUOTE_SCHEMA_VERSION,
    status: "new",
    source: "web-configurator:test",
    customer: CUSTOMER,
    additionalServices: services,
    configuration,
    pricing: {
      estimatedTotal: breakdown.total,
      currency: "SAR",
      isEstimate: breakdown.isEstimate,
    },
    validation: { status: validation.status, messages: validation.messages },
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

describe("boundary validation", () => {
  it("recomputes the total instead of trusting the client", () => {
    const tampered = buildRequest();
    tampered.pricing.estimatedTotal = 1;

    const result = validateQuoteRequest(tampered);
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.issues.some((i) => i.field === "pricing.estimatedTotal")).toBe(
        true,
      );
    }
  });

  it("rejects a configuration with a blocking incompatibility", () => {
    const request = buildRequest({
      configuration: configure({
        roof: { roofId: "ROOF-PERGOLA" },
        addons: ["ADD-FAN"],
      }),
    });
    const result = validateQuoteRequest(request);
    expect(result.ok).toBe(false);
  });

  it("accepts a design that only needs engineering review", () => {
    const configuration = configure({
      environment: "ENV-ROOFTOP",
      aquarium: AQUARIUM_1200,
    });
    expect(evaluateConfiguration(configuration).status).toBe("review_required");

    const result = validateQuoteRequest(buildRequest({ configuration }));
    expect(result.ok).toBe(true);
  });

  it("drops unknown services and re-prices from the known ones", () => {
    const request = buildRequest({ additionalServices: ["SVC-DELIVERY"] });
    request.additionalServices = ["SVC-DELIVERY", "SVC-MADE-UP"];

    const result = validateQuoteRequest(request);
    expect(result.ok).toBe(false);
  });
});

describe("LocalDemoQuoteRepository", () => {
  it("stores the request in this browser and reads it back", async () => {
    const repo = new LocalDemoQuoteRepository();
    const request = buildRequest();

    const result = await repo.submit(request);
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.storedIn).toBe("local");

    const found = await repo.getByReference(request.reference);
    expect(found?.reference).toBe(request.reference);
    expect(found?.estimatedTotal).toBe(request.pricing.estimatedTotal);
  });

  it("does not expose contact details through getByReference", async () => {
    const repo = new LocalDemoQuoteRepository();
    await repo.submit(buildRequest());

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
    await repo.submit(buildRequest());
    const second = await repo.submit(buildRequest());
    expect(second.ok).toBe(false);
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

  it("succeeds only when the remote write is confirmed", async () => {
    const fetchImpl = vi.fn(async () =>
      new Response(JSON.stringify([{ reference: "NV-TEST-0001" }]), {
        status: 201,
      }),
    ) as unknown as typeof fetch;

    const result = await repoWith(fetchImpl).submit(buildRequest());
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.storedIn).toBe("remote");
  });

  it("reports a retryable failure on a server error", async () => {
    const fetchImpl = vi.fn(async () =>
      new Response("boom", { status: 503 }),
    ) as unknown as typeof fetch;

    const result = await repoWith(fetchImpl).submit(buildRequest());
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.retryable).toBe(true);
      expect(result.error.code).toBe("network");
    }
  });

  it("reports a non-retryable failure when the request is rejected", async () => {
    const fetchImpl = vi.fn(async () =>
      new Response("denied", { status: 401 }),
    ) as unknown as typeof fetch;

    const result = await repoWith(fetchImpl).submit(buildRequest());
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error.retryable).toBe(false);
  });

  it("treats a thrown network error as retryable", async () => {
    const fetchImpl = vi.fn(async () => {
      throw new Error("offline");
    }) as unknown as typeof fetch;

    const result = await repoWith(fetchImpl).submit(buildRequest());
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error.retryable).toBe(true);
  });

  it("refuses to submit when credentials are missing", async () => {
    const repo = new RemoteQuoteRepository({ url: "", anonKey: "" });
    const result = await repo.submit(buildRequest());
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error.code).toBe("not_configured");
  });

  it("restores a record by reference through the summary function", async () => {
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

describe("team notification", () => {
  it("summarises the lead without leaking the message body", () => {
    const payload = buildNotificationPayload(buildRequest());
    expect(payload.reference).toBe("NV-TEST-0001");
    expect(JSON.stringify(payload)).not.toContain("Please include delivery.");
  });
});
