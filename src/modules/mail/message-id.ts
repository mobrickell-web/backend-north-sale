/**
 * Nodemailer reports the provider message id wrapped in angle brackets
 * (`<abc@host>`) while SendGrid webhooks send it bare (`abc@host`). Both forms
 * must collapse to the same string or the webhook can never join back onto the
 * stored delivery row.
 *
 * Lives in its own module because both the mail service (which writes the id)
 * and the webhook controller (which matches on it) depend on it, and the mail
 * service should not be imported for a pure helper.
 */
export function normalizeMessageId(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim().replace(/^</, "").replace(/>$/, "").trim();
  return trimmed.length > 0 ? trimmed : null;
}
