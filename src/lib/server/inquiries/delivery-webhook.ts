import "server-only";
import { createHmac, timingSafeEqual } from "node:crypto";
import { callRpc, JOB_TAG, readBounded, type Configuration } from "./persistence";

const MAX_BODY_BYTES = 64 * 1024;
// Svix's own libraries use five minutes either side.
const TOLERANCE_SECONDS = 5 * 60;
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const TRACKED = new Set(["email.sent", "email.delivery_delayed", "email.delivered", "email.bounced",
  "email.failed", "email.suppressed", "email.complained"]);

export type WebhookResult = { status: 200 | 400 | 401 | 413 | 503; body: Record<string, unknown> };

/** Svix scheme used by Resend: HMAC-SHA256 over `${id}.${timestamp}.${rawBody}` keyed with the
 * base64 part of `whsec_...`; the header lists space-separated `v1,<base64>` signatures.
 */
export function verifySignature(secret: string, headers: Headers, body: Uint8Array, nowMs = Date.now()): boolean {
  const id = headers.get("svix-id") ?? "", timestamp = headers.get("svix-timestamp") ?? "";
  const signatures = headers.get("svix-signature") ?? "";
  if (!id || !/^\d{1,12}$/.test(timestamp) || Math.abs(nowMs / 1000 - Number(timestamp)) > TOLERANCE_SECONDS) return false;
  const expected = createHmac("sha256", Buffer.from(secret.slice("whsec_".length), "base64"))
    .update(`${id}.${timestamp}.`).update(body).digest();
  return signatures.split(" ").some((entry) => {
    const [version, signature] = entry.split(",");
    if (version !== "v1" || !signature) return false;
    const given = Buffer.from(signature, "base64");
    return given.length === expected.length && timingSafeEqual(given, expected);
  });
}

type Event = { type: string; email_id: string; job_id: string | null; occurred_at: string };

/** null: malformed; "ignored": a well-formed event type the inquiry workflow does not track. */
function parseEvent(bytes: Uint8Array): Event | "ignored" | null {
  let value: unknown;
  try { value = JSON.parse(new TextDecoder("utf-8", { fatal: true }).decode(bytes)); } catch { return null; }
  if (!value || typeof value !== "object") return null;
  const { type, created_at: createdAt, data } = value as Record<string, unknown>;
  if (typeof type !== "string") return null;
  // Opens, clicks, inbound mail, contact/domain events and future types: nothing to store.
  if (!TRACKED.has(type)) return "ignored";
  if (typeof createdAt !== "string" || Number.isNaN(Date.parse(createdAt)) || !data || typeof data !== "object") return null;
  const { email_id: emailId, tags } = data as Record<string, unknown>;
  if (typeof emailId !== "string" || !emailId.trim() || emailId.length > 200) return null;
  // Resend's examples show a { name: value } map; also accept the send API's [{ name, value }].
  const tag: unknown = Array.isArray(tags)
    ? tags.find((entry) => entry && typeof entry === "object" && entry.name === JOB_TAG)?.value
    : tags && typeof tags === "object" ? (tags as Record<string, unknown>)[JOB_TAG] : undefined;
  return { type, email_id: emailId, occurred_at: new Date(createdAt).toISOString(),
    job_id: typeof tag === "string" && UUID.test(tag) ? tag.toLowerCase() : null };
}

/** Verifies, deduplicates and stores one Resend webhook. Any non-2xx makes Resend retry
 * (about 27 hours), so storage problems answer 503 and verified events are never dropped.
 */
export async function handleResendWebhook(request: Request, dependencies: {
  configuration: Configuration | null; secret: string | undefined; fetch?: typeof fetch;
  logError: (code: string) => void; now?: number;
}): Promise<WebhookResult> {
  const { configuration, secret, logError } = dependencies;
  if (!configuration || !secret?.startsWith("whsec_")) {
    logError("webhook_not_configured");
    return { status: 503, body: { error: "Webhook is not configured." } };
  }
  if (!request.body) return { status: 400, body: { error: "Missing body." } };
  if (Number(request.headers.get("content-length")) > MAX_BODY_BYTES) {
    void request.body.cancel().catch(() => {});
    return { status: 413, body: { error: "Too large." } };
  }
  const bytes = await readBounded(request.body, MAX_BODY_BYTES);
  if (!bytes) return { status: 413, body: { error: "Too large." } };
  if (!verifySignature(secret, request.headers, bytes, dependencies.now)) {
    return { status: 401, body: { error: "Invalid signature." } };
  }
  const eventId = request.headers.get("svix-id") ?? "";
  const event = parseEvent(bytes);
  if (!event || !/^[A-Za-z0-9_-]{1,100}$/.test(eventId)) {
    logError("webhook_malformed_event");
    return { status: 400, body: { error: "Malformed event." } };
  }
  if (event === "ignored") return { status: 200, body: { ok: true, ignored: true } };
  const result = await callRpc(configuration, "record_delivery_event", {
    p_event_id: eventId, p_event_type: event.type, p_email_id: event.email_id,
    p_job_id: event.job_id, p_occurred_at: event.occurred_at,
  }, 64, dependencies.fetch);
  if (result === "recorded" || result === "duplicate" || result === "unrelated") return { status: 200, body: { ok: true } };
  logError(result === "overflow" ? "webhook_unmatched_backlog_full" : "webhook_storage_unavailable");
  return { status: 503, body: { error: "Event could not be stored." } };
}
