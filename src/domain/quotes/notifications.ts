import { NOTIFY_WEBHOOK_URL } from "@/constants/appConfig";
import type { QuoteRequest } from "@/domain/configuration/schema";

/**
 * Team notification on a new lead.
 *
 * The database row is the source of truth. A notification failure must never
 * lose or invalidate the lead, so this never throws and its result is never
 * allowed to affect the submission outcome.
 *
 * When `NEXT_PUBLIC_NOTIFY_WEBHOOK_URL` is unset — the default — this is a
 * no-op and the extension point simply sits unused. Point it at a Zapier/Make
 * catch hook, a Slack incoming webhook, or an edge function that emails the
 * team. Anything needing a secret must live server-side, not in a
 * `NEXT_PUBLIC_*` value.
 */

export type NotificationResult =
  | { attempted: false }
  | { attempted: true; ok: boolean; detail?: string };

/** Deliberately excludes the message body; the dashboard holds the detail. */
export function buildNotificationPayload(request: QuoteRequest) {
  return {
    type: "quote.created",
    reference: request.reference,
    submittedAt: request.submittedAt,
    customerName: request.customer.fullName,
    city: request.customer.city,
    preferredContact: request.customer.preferredContact,
    estimatedTotal: request.pricing.estimatedTotal,
    currency: request.pricing.currency,
    isEstimate: request.pricing.isEstimate,
    validationStatus: request.validation.status,
    services: request.additionalServices,
  };
}

export async function notifyTeam(
  request: QuoteRequest,
  fetchImpl: typeof fetch = globalThis.fetch?.bind(globalThis),
): Promise<NotificationResult> {
  if (!NOTIFY_WEBHOOK_URL || !fetchImpl) return { attempted: false };

  try {
    const response = await fetchImpl(NOTIFY_WEBHOOK_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(buildNotificationPayload(request)),
    });
    return { attempted: true, ok: response.ok };
  } catch (error) {
    return {
      attempted: true,
      ok: false,
      detail: error instanceof Error ? error.message : String(error),
    };
  }
}
