import { createVerify } from "node:crypto";

/** SendGrid signs with ECDSA on the P-256 (secp256r1) curve. */
const CURVE = "prime256v1";
const HASH = "sha256";

export const SIGNATURE_HEADER = "x-twilio-email-event-webhook-signature";
export const TIMESTAMP_HEADER = "x-twilio-email-event-webhook-timestamp";

/**
 * SendGrid recommends rejecting anything older than a few minutes. Without this
 * a captured request could be replayed later to flip a delivery status.
 */
export const MAX_SIGNATURE_AGE_SECONDS = 10 * 60;

export type SignatureResult =
  | { ok: true }
  | {
      ok: false;
      reason:
        | "missing_headers"
        | "key_not_configured"
        | "stale_timestamp"
        | "bad_signature";
    };

/**
 * Decodes the public key SendGrid provides as base64 PEM. Config values are
 * usually pasted as a single line with literal "\n", so those are restored.
 */
export function parsePublicKey(raw: string | undefined): string | null {
  if (!raw) return null;
  const trimmed = raw.trim();
  if (!trimmed) return null;

  // Tolerate a value that is already a PEM.
  if (trimmed.includes("-----BEGIN")) {
    return trimmed.replace(/\\n/g, "\n");
  }

  try {
    const pem = Buffer.from(trimmed, "base64").toString("utf8");
    if (!pem.includes("-----BEGIN")) return null;
    return pem.replace(/\\n/g, "\n");
  } catch {
    return null;
  }
}

/**
 * SendGrid signs `timestamp + rawPayload`. The raw bytes must be supplied as
 * received — see the `rawBody` flag in main.ts.
 */
export function verifySendGridSignature(options: {
  publicKey: string | undefined;
  signature: string | undefined;
  timestamp: string | undefined;
  rawBody: Buffer | undefined;
  now?: Date;
}): SignatureResult {
  const { publicKey, signature, timestamp, rawBody } = options;

  if (!signature || !timestamp || !rawBody) {
    return { ok: false, reason: "missing_headers" };
  }

  const pem = parsePublicKey(publicKey);
  if (!pem) return { ok: false, reason: "key_not_configured" };

  const timestampSeconds = Number(timestamp);
  if (!Number.isFinite(timestampSeconds)) {
    return { ok: false, reason: "stale_timestamp" };
  }

  const nowMs = (options.now ?? new Date()).getTime();
  const ageSeconds = Math.abs(nowMs / 1000 - timestampSeconds);
  if (ageSeconds > MAX_SIGNATURE_AGE_SECONDS) {
    return { ok: false, reason: "stale_timestamp" };
  }

  let signatureBytes: Buffer;
  try {
    signatureBytes = Buffer.from(signature, "base64");
  } catch {
    return { ok: false, reason: "bad_signature" };
  }

  if (signatureBytes.length === 0) {
    return { ok: false, reason: "bad_signature" };
  }

  try {
    const verifier = createVerify(HASH);
    verifier.update(timestamp, "utf8");
    verifier.update(rawBody);
    verifier.end();

    const valid = verifier.verify(
      { key: pem, dsaEncoding: "der" },
      signatureBytes,
    );

    return valid ? { ok: true } : { ok: false, reason: "bad_signature" };
  } catch {
    // A malformed key or signature surfaces as a throw rather than `false`.
    return { ok: false, reason: "bad_signature" };
  }
}

export const SIGNATURE_FAILURE_MESSAGES: Record<string, string> = {
  missing_headers: "Missing signature headers.",
  key_not_configured:
    "SENDGRID_WEBHOOK_PUBLIC_KEY is not configured — refusing to trust webhooks.",
  stale_timestamp: "Signature timestamp is outside the accepted window.",
  bad_signature: "Signature verification failed.",
};

export { CURVE };
