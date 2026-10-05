/**
 * Maps SendGrid event names onto `EmailDeliveryStatus`. Anything not listed is
 * not a delivery outcome (opens, clicks, groups) and is deliberately ignored —
 * recording those would overwrite a real delivery status with noise.
 */
export const EVENT_TO_STATUS = {
  delivered: "DELIVERED",
  bounce: "BOUNCED",
  drop: "DROPPED",
  deferred: "DEFERRED",
  spamreport: "SPAMREPORT",
  unsubscribe: "UNSUBSCRIBED",
} as const;

export type DeliverableEvent = keyof typeof EVENT_TO_STATUS;

/** The `EmailDeliveryStatus` value an event maps to, e.g. "bounce" → "BOUNCED". */
export type DeliveryStatus = (typeof EVENT_TO_STATUS)[DeliverableEvent];

/** Events that can arrive with no `message_id` and therefore cannot be joined. */
export const IGNORED_EVENTS = [
  "processed",
  "open",
  "click",
  "group_unsubscribe",
  "group_resubscribe",
  "deferred_retries_exhausted",
] as const;

export type SendGridEvent = {
  email?: string;
  event?: string;
  timestamp?: number;
  message_id?: string;
  sg_message_id?: string;
  reason?: string;
  status?: string;
  response?: string;
  attempt?: string;
  bounce_classification?: string;
};

export function mapEventToStatus(event: string): DeliveryStatus | null {
  return event in EVENT_TO_STATUS
    ? EVENT_TO_STATUS[event as DeliverableEvent]
    : null;
}

/**
 * Keeps the most meaningful reason SendGrid gave us. A bounce carries both a
 * short `reason` and a longer SMTP `response`, and the response is usually the
 * one worth reading ("550 5.1.1 mailbox does not exist").
 */
export function describeFailure(event: SendGridEvent): string | null {
  const parts: string[] = [];
  if (event.reason) parts.push(event.reason);
  if (event.bounce_classification) {
    parts.push(`class=${event.bounce_classification}`);
  }
  if (event.status) parts.push(`smtp=${event.status}`);
  if (event.response && event.response !== event.reason) {
    parts.push(event.response);
  }
  if (event.attempt) parts.push(`attempt=${event.attempt}`);
  return parts.length > 0 ? parts.join(" | ").slice(0, 2000) : null;
}
