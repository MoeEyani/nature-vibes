import type { QuoteRequest } from "../configuration/schema.ts";

/**
 * What the team is told about a new lead.
 *
 * Contains no email, phone or message body: the notification travels through a
 * third-party channel (Slack, a webhook relay) and only needs to say that a
 * lead exists and what it is worth looking at. The full record lives in the
 * database, behind authentication.
 */
export function buildNotificationPayload(request: QuoteRequest) {
  return {
    type: "quote.created" as const,
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

export type NotificationPayload = ReturnType<typeof buildNotificationPayload>;
