import { beforeEach, describe, expect, it, vi } from "vitest";
import { clearStorage } from "./setup";
import {
  handleSubmitQuote,
  type BoundaryLogEvent,
  type InsertOutcome,
  type QuoteRow,
} from "@shared/boundary/handleSubmitQuote";
import { buildNotificationPayload } from "@shared/boundary/notification";
import type { PublicQuoteSubmission } from "@shared/boundary/publicSubmission";
import { QUOTE_SCHEMA_VERSION } from "@shared/configuration/schema";
import { calculatePrice } from "@shared/pricing/calculatePrice";
import { AQUARIUM_1200, configure } from "./helpers";

const CUSTOMER = {
  fullName: "Boundary Tester",
  email: "boundary@example.com",
  phone: "+966 50 123 4567",
  city: "Riyadh",
  preferredContact: "email" as const,
  message: "A private note that must not travel to Slack.",
  consent: true,
};

function submission(
  overrides: Partial<PublicQuoteSubmission> = {},
): PublicQuoteSubmission {
  return {
    schemaVersion: QUOTE_SCHEMA_VERSION,
    customer: CUSTOMER,
    configuration: configure(),
    selectedServiceIds: ["SVC-DELIVERY"],
    source: "web-configurator",
    ...overrides,
  };
}

/** Collects the rows a run would have written. */
function recorder() {
  const rows: QuoteRow[] = [];
  const insertLead = vi.fn(async (row: QuoteRow): Promise<InsertOutcome> => {
    rows.push(row);
    return { ok: true };
  });
  return { rows, insertLead };
}

beforeEach(clearStorage);

describe("payload contract", () => {
  it("accepts a well-formed submission and returns no personal data", async () => {
    const { insertLead } = recorder();
    const result = await handleSubmitQuote(submission(), { insertLead });

    expect(result.status).toBe(201);
    expect(result.body.ok).toBe(true);

    // The response confirms receipt and nothing more.
    const serialised = JSON.stringify(result.body);
    expect(serialised).not.toContain("boundary@example.com");
    expect(serialised).not.toContain("+966 50 123 4567");
    expect(serialised).not.toContain("Boundary Tester");
    expect(Object.keys(result.body)).toEqual([
      "ok",
      "reference",
      "submittedAt",
      "status",
    ]);
  });

  it("rejects a malformed payload without touching the database", async () => {
    const { insertLead } = recorder();
    const result = await handleSubmitQuote({ nonsense: true }, { insertLead });

    expect(result.status).toBe(400);
    expect(insertLead).not.toHaveBeenCalled();
  });

  it("requires consent", async () => {
    const { insertLead } = recorder();
    const result = await handleSubmitQuote(
      submission({ customer: { ...CUSTOMER, consent: false } }),
      { insertLead },
    );
    expect(result.status).toBe(400);
    expect(insertLead).not.toHaveBeenCalled();
  });

  it("rejects a malformed reference rather than storing it", async () => {
    const { insertLead } = recorder();
    const result = await handleSubmitQuote(
      { ...submission(), reference: "not-a-reference" },
      { insertLead },
    );
    expect(result.status).toBe(400);
    expect(insertLead).not.toHaveBeenCalled();
  });
});

describe("client-supplied values are not authoritative", () => {
  it("ignores a price the client tries to inject and computes its own", async () => {
    const { rows, insertLead } = recorder();

    // A crafted payload carrying a bargain total and a clean bill of health.
    await handleSubmitQuote(
      {
        ...submission(),
        pricing: { estimatedTotal: 1, currency: "SAR", isEstimate: false },
        validation: { status: "ok", messages: [] },
      },
      { insertLead },
    );

    const expected = calculatePrice(configure(), {
      selectedServiceIds: ["SVC-DELIVERY"],
    });
    const stored = rows[0].pricing_json as { estimatedTotal: number; isEstimate: boolean };

    expect(stored.estimatedTotal).toBe(expected.total);
    expect(stored.estimatedTotal).not.toBe(1);
    expect(stored.isEstimate).toBe(true);
  });

  it("produces its own validation snapshot", async () => {
    const { rows, insertLead } = recorder();
    await handleSubmitQuote(
      {
        ...submission({
          configuration: configure({
            environment: "ENV-ROOFTOP",
            aquarium: AQUARIUM_1200,
          }),
        }),
        validation: { status: "ok", messages: [] },
      },
      { insertLead },
    );

    const stored = rows[0].validation_json as { status: string };
    expect(stored.status).toBe("review_required");
  });

  it("stamps status 'new' and its own timestamp", async () => {
    const { rows, insertLead } = recorder();
    const now = new Date("2026-01-01T00:00:00.000Z");

    await handleSubmitQuote(
      { ...submission(), status: "won", submittedAt: "1999-01-01T00:00:00.000Z" },
      { insertLead, now: () => now },
    );

    expect(rows[0].status).toBe("new");
    expect(rows[0].submitted_at).toBe(now.toISOString());
  });
});

describe("configuration checks", () => {
  it("rejects an invented id in a scalar field, which normalisation leaves intact", async () => {
    const { insertLead } = recorder();
    const config = configure();
    const result = await handleSubmitQuote(
      submission({
        configuration: { ...config, roof: { roofId: "ROOF-INVENTED" } },
      }),
      { insertLead },
    );

    expect(result.status).toBe(400);
    expect(result.body.ok).toBe(false);
    if (!result.body.ok) expect(result.body.error.code).toBe("configuration_rejected");
    expect(insertLead).not.toHaveBeenCalled();
  });

  it("rejects an invented id in a list field rather than silently dropping it", async () => {
    const { insertLead } = recorder();
    const config = configure();
    const result = await handleSubmitQuote(
      submission({
        // normalizeConfiguration would strip this; the boundary refuses the
        // payload instead, so a hostile request is never quietly cleaned.
        configuration: { ...config, addons: [...config.addons, "ADD-TOTALLY-MADE-UP"] },
      }),
      { insertLead },
    );

    expect(result.status).toBe(400);
    expect(insertLead).not.toHaveBeenCalled();
  });

  it("rejects an unknown service id", async () => {
    const { insertLead } = recorder();
    const result = await handleSubmitQuote(
      submission({ selectedServiceIds: ["SVC-DELIVERY", "SVC-INVENTED"] }),
      { insertLead },
    );
    expect(result.status).toBe(400);
    expect(insertLead).not.toHaveBeenCalled();
  });

  it("rejects a blocking incompatibility", async () => {
    const { insertLead } = recorder();
    const result = await handleSubmitQuote(
      submission({
        configuration: configure({
          roof: { roofId: "ROOF-PERGOLA" },
          addons: ["ADD-FAN"],
        }),
      }),
      { insertLead },
    );

    expect(result.status).toBe(400);
    if (!result.body.ok) expect(result.body.error.code).toBe("configuration_rejected");
    expect(insertLead).not.toHaveBeenCalled();
  });

  it("accepts a design that only needs engineering review", async () => {
    const { insertLead } = recorder();
    const result = await handleSubmitQuote(
      submission({
        configuration: configure({
          environment: "ENV-ROOFTOP",
          aquarium: AQUARIUM_1200,
        }),
      }),
      { insertLead },
    );

    expect(result.status).toBe(201);
    expect(insertLead).toHaveBeenCalledOnce();
  });

  it("normalises duplicate services so nothing is charged twice", async () => {
    const { rows, insertLead } = recorder();
    await handleSubmitQuote(
      submission({ selectedServiceIds: ["SVC-DELIVERY", "SVC-DELIVERY"] }),
      { insertLead },
    );
    expect(rows[0].additional_services_json).toEqual(["SVC-DELIVERY"]);
  });
});

describe("anti-spam and rate limiting", () => {
  it("rejects a failed captcha before doing any work", async () => {
    const { insertLead } = recorder();
    const result = await handleSubmitQuote(submission(), {
      insertLead,
      verifyCaptcha: async () => ({ ok: false, detail: "bad token" }),
    });

    expect(result.status).toBe(403);
    if (!result.body.ok) expect(result.body.error.code).toBe("captcha_failed");
    expect(insertLead).not.toHaveBeenCalled();
  });

  it("passes the submitted token to the verifier", async () => {
    const { insertLead } = recorder();
    const verifyCaptcha = vi.fn(async () => ({ ok: true as const }));

    await handleSubmitQuote(
      submission({ antiSpam: { turnstileToken: "tok_123" } }),
      { insertLead, verifyCaptcha },
    );
    expect(verifyCaptcha).toHaveBeenCalledWith("tok_123");
  });

  it("rejects over the rate limit with 429 and stores nothing", async () => {
    const { insertLead } = recorder();
    const result = await handleSubmitQuote(submission(), {
      insertLead,
      checkRateLimit: async () => ({ allowed: false, detail: "6 in the last hour" }),
    });

    expect(result.status).toBe(429);
    if (!result.body.ok) expect(result.body.error.code).toBe("rate_limited");
    expect(insertLead).not.toHaveBeenCalled();
  });

  it("skips captcha and rate limiting when they are not configured", async () => {
    const { insertLead } = recorder();
    const result = await handleSubmitQuote(submission(), { insertLead });
    expect(result.status).toBe(201);
  });
});

describe("persistence and notification ordering", () => {
  it("returns 409 for a duplicate reference", async () => {
    const insertLead = vi.fn(async (): Promise<InsertOutcome> => ({
      ok: false,
      reason: "duplicate",
    }));
    const result = await handleSubmitQuote(submission(), { insertLead });

    expect(result.status).toBe(409);
    if (!result.body.ok) expect(result.body.error.code).toBe("duplicate");
  });

  it("returns 500 and never claims success when the insert fails", async () => {
    const insertLead = vi.fn(async (): Promise<InsertOutcome> => ({
      ok: false,
      reason: "error",
      detail: "connection reset",
    }));
    const notify = vi.fn(async () => {});

    const result = await handleSubmitQuote(submission(), { insertLead, notify });

    expect(result.status).toBe(500);
    expect(result.body.ok).toBe(false);
    // Nothing may be announced for a lead that does not exist.
    expect(notify).not.toHaveBeenCalled();
  });

  it("notifies only after a confirmed insert", async () => {
    const order: string[] = [];
    const insertLead = vi.fn(async (): Promise<InsertOutcome> => {
      order.push("insert");
      return { ok: true };
    });
    const notify = vi.fn(async () => {
      order.push("notify");
    });

    await handleSubmitQuote(submission(), { insertLead, notify });
    expect(order).toEqual(["insert", "notify"]);
  });

  it("keeps the lead when the notification throws", async () => {
    const { insertLead } = recorder();
    const events: BoundaryLogEvent[] = [];

    const result = await handleSubmitQuote(submission(), {
      insertLead,
      notify: async () => {
        throw new Error("slack is down");
      },
      log: (event) => events.push(event),
    });

    // The customer is still told their request was received, because it was.
    expect(result.status).toBe(201);
    expect(result.body.ok).toBe(true);
    expect(events.some((event) => event.type === "inserted")).toBe(true);
    expect(events.some((event) => event.type === "notify_failed")).toBe(true);
  });

  it("logs no contact details", async () => {
    const { insertLead } = recorder();
    const events: BoundaryLogEvent[] = [];

    await handleSubmitQuote(submission(), {
      insertLead,
      notify: async () => {
        throw new Error("nope");
      },
      log: (event) => events.push(event),
    });

    const serialised = JSON.stringify(events);
    expect(serialised).not.toContain("boundary@example.com");
    expect(serialised).not.toContain("+966 50 123 4567");
  });
});

describe("notification payload", () => {
  it("carries what the team needs and no more", async () => {
    const { rows, insertLead } = recorder();
    let captured: ReturnType<typeof buildNotificationPayload> | null = null;

    await handleSubmitQuote(submission(), {
      insertLead,
      notify: async (request) => {
        captured = buildNotificationPayload(request);
      },
    });

    expect(rows).toHaveLength(1);
    expect(captured).not.toBeNull();

    const serialised = JSON.stringify(captured);
    // Enough to triage the lead…
    expect(serialised).toContain("Boundary Tester");
    expect(serialised).toContain("Riyadh");
    // …without the contact details or the message body.
    expect(serialised).not.toContain("boundary@example.com");
    expect(serialised).not.toContain("+966 50 123 4567");
    expect(serialised).not.toContain("must not travel to Slack");
  });
});
