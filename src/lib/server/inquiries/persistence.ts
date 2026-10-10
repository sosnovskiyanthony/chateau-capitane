import "server-only";
import type { NormalizedInquiry } from "./contact-input";

type Configuration = Readonly<{ url: string; secretKey: string }>;
export type NotificationSettings = Readonly<{ from: string; to: string }>;
export type RecordInquiryResult =
  | { kind: "recorded"; inquiryId: string }
  | { kind: "conflict" }
  | { kind: "unavailable" };

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const SENDER = /^(?:[^\s<>@]+@[^\s<>@]+\.[^\s<>@]+|[^<>\r\n]+ <[^\s<>@]+@[^\s<>@]+\.[^\s<>@]+>)$/;

/** B02 is inactive: only a future server intake route may call this module. */
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
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 10_000);
  try {
    const response = await (dependencies.fetch ?? fetch)(`${configuration.url}/rest/v1/rpc/record_contact_inquiry`, {
      method: "POST",
      headers: { "Content-Type": "application/json", apikey: configuration.secretKey },
      body: JSON.stringify({ p_inquiry: inquiry, p_key: submissionKey?.toLowerCase() ?? null, p_notification: notification }),
      cache: "no-store",
      signal: controller.signal,
    });
    if (!response.ok) {
      void response.body?.cancel().catch(() => {});
      return { kind: "unavailable" };
    }
    // Acknowledgments are tiny; bound reads even if a proxy returns an unexpected body.
    const reader = response.body?.getReader();
    if (!reader) return { kind: "unavailable" };
    const chunks: Uint8Array[] = [];
    let length = 0;
    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        length += value.byteLength;
        if (length > 2048) { void reader.cancel().catch(() => {}); return { kind: "unavailable" }; }
        chunks.push(value);
      }
    } finally { reader.releaseLock(); }
    const bytes = new Uint8Array(length);
    let offset = 0;
    for (const chunk of chunks) { bytes.set(chunk, offset); offset += chunk.byteLength; }
    const result: unknown = JSON.parse(new TextDecoder().decode(bytes));
    if (result && typeof result === "object" && "kind" in result) {
      if (result.kind === "conflict") return { kind: "conflict" };
      if (result.kind === "recorded" && "inquiryId" in result &&
          typeof result.inquiryId === "string" && UUID.test(result.inquiryId)) {
        return { kind: "recorded", inquiryId: result.inquiryId };
      }
    }
    return { kind: "unavailable" };
  } catch { return { kind: "unavailable" }; }
  finally { clearTimeout(timeout); }
}
