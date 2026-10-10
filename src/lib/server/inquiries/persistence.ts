import "server-only";
import type { NormalizedInquiry } from "./contact-input";

export type Configuration = Readonly<{ url: string; secretKey: string }>;
export type NotificationSettings = Readonly<{ from: string; to: string }>;
export type RecordInquiryResult =
  | { kind: "recorded"; inquiryId: string }
  | { kind: "conflict" }
  | { kind: "unavailable" };

/** Resend tag on every notification send, so delivery events find their job even after a lost response. */
export const JOB_TAG = "notification_job";
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const SENDER = /^(?:[^\s<>@]+@[^\s<>@]+\.[^\s<>@]+|[^<>\r\n]+ <[^\s<>@]+@[^\s<>@]+\.[^\s<>@]+>)$/;

/** Server-only routes: contact intake, notification cron and Resend webhook. */
export function getPersistenceConfiguration(env: NodeJS.ProcessEnv = process.env): Configuration | null {
  const secretKey = env.SUPABASE_SECRET_KEY?.trim();
  if (!env.SUPABASE_URL || !secretKey?.startsWith("sb_secret_")) return null;
  try {
    const url = new URL(env.SUPABASE_URL);
    const local = ["127.0.0.1", "localhost", "[::1]"].includes(url.hostname);
    if ((url.protocol !== "https:" && !(local && url.protocol === "http:")) ||
        url.username || url.password || url.search || url.hash || url.pathname !== "/") return null;
    return { url: url.origin, secretKey };
  } catch { return null; }
}

/** Caller must pass a valid parseContactInput result and server-controlled settings.
 * A timeout/network failure may follow a commit. Never retry here or invent a new key.
 * Only a same-key caller retry can resolve that uncertainty.
 */
export async function recordContactInquiry(
  inquiry: NormalizedInquiry,
  submissionKey: string | null,
  settings: NotificationSettings,
  dependencies: { configuration: Configuration | null; fetch?: typeof fetch },
): Promise<RecordInquiryResult> {
  const configuration = dependencies.configuration;
  if (!configuration || (submissionKey !== null && !UUID.test(submissionKey)) ||
      settings.from.length > 320 || !SENDER.test(settings.from) ||
      settings.to.length > 254 || !EMAIL.test(settings.to)) return { kind: "unavailable" };
  const notification = {
    sender: settings.from,
    recipient: settings.to,
    reply_to: inquiry.email,
    subject: `Website enquiry from ${inquiry.name}`,
    body: [
      `Name: ${inquiry.name}`, `Email: ${inquiry.email}`,
      `Phone: ${inquiry.phone || "Not provided"}`, `Date: ${inquiry.date || "Not provided"}`,
      `Guests: ${inquiry.guests || "Not provided"}`, "", inquiry.message,
    ].join("\n"),
  };
  const result = await callRpc(configuration, "record_contact_inquiry",
    { p_inquiry: inquiry, p_key: submissionKey?.toLowerCase() ?? null, p_notification: notification },
    2048, dependencies.fetch);
  if (result && typeof result === "object" && "kind" in result) {
    if (result.kind === "conflict") return { kind: "conflict" };
    if (result.kind === "recorded" && "inquiryId" in result &&
        typeof result.inquiryId === "string" && UUID.test(result.inquiryId)) {
      return { kind: "recorded", inquiryId: result.inquiryId };
    }
  }
  return { kind: "unavailable" };
}

/** One no-store PostgREST RPC POST with a bounded body and ten-second timeout.
 * Returns the parsed JSON, or undefined on any failure. Never retries or logs bodies.
 */
export async function callRpc(
  configuration: Configuration, name: string, args: unknown, maxBytes: number, fetchImpl: typeof fetch = fetch,
): Promise<unknown> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 10_000);
  try {
    const response = await fetchImpl(`${configuration.url}/rest/v1/rpc/${name}`, {
      method: "POST",
      headers: { "Content-Type": "application/json", apikey: configuration.secretKey },
      body: JSON.stringify(args),
      cache: "no-store",
      signal: controller.signal,
    });
    if (!response.ok) {
      void response.body?.cancel().catch(() => {});
      return undefined;
    }
    // Bound reads even if a proxy returns an unexpected body.
    const bytes = await readBounded(response.body, maxBytes);
    if (!bytes) return undefined;
    return JSON.parse(new TextDecoder().decode(bytes)) as unknown;
  } catch { return undefined; }
  finally { clearTimeout(timeout); }
}

/** Reads a body up to maxBytes; null when missing or larger (stops reading at the limit). */
export async function readBounded(body: ReadableStream<Uint8Array> | null, maxBytes: number): Promise<Uint8Array | null> {
  const reader = body?.getReader();
  if (!reader) return null;
  const chunks: Uint8Array[] = [];
  let length = 0;
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      length += value.byteLength;
      if (length > maxBytes) { void reader.cancel().catch(() => {}); return null; }
      chunks.push(value);
    }
  } finally { reader.releaseLock(); }
  const bytes = new Uint8Array(length);
  let offset = 0;
  for (const chunk of chunks) { bytes.set(chunk, offset); offset += chunk.byteLength; }
  return bytes;
}
