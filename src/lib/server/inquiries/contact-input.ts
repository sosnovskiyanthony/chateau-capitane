import { getPrivateEventTiers, packageLabel, type BanquetTier } from "@/lib/data/private-events";

const MAX_BODY_BYTES = 32 * 1024;
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;
const GUESTS_PATTERN = /^[1-9]\d{0,3}$/;
const SUBMISSION_KEY_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

/** Validated guest fields; excludes routing, workflow and honeypot input. */
export type NormalizedInquiry = Readonly<{
  name: string;
  email: string;
  phone: string;
  date: string;
  guests: string;
  message: string;
  kind: "contact" | "event";
  /** Package label as shown to the guest when they asked (name and price); "" when none chosen. */
  eventPackage: string;
}>;

/** Form value for an event inquiry that has not picked a package yet. */
export const UNDECIDED_EVENT = "undecided";

/** Snapshot label for a published package, or null when the ID is not offered. */
function snapshotPackage(tiers: readonly BanquetTier[], id: string): string | null {
  const tier = tiers.find((candidate) => candidate.id === id);
  return tier ? packageLabel(tier) : null;
}

export type ContactInputResult =
  | { kind: "valid"; inquiry: NormalizedInquiry; submissionKey: string | null }
  | { kind: "discard" }
  | { kind: "invalid"; status: 400 | 413 | 415; error: string };

function invalid(status: 400 | 413 | 415, body: { error: string }): ContactInputResult {
  return { kind: "invalid", status, error: body.error };
}

class BodyError extends Error {
  constructor(public status: number) { super("Invalid contact request body"); }
}

async function readBody(request: Request): Promise<unknown> {
  if (Number(request.headers.get("content-length")) > MAX_BODY_BYTES) throw new BodyError(413);
  if (!request.body) throw new BodyError(400);
  const reader = request.body.getReader();
  const chunks: Uint8Array[] = [];
  let size = 0;
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      size += value.byteLength;
      if (size > MAX_BODY_BYTES) {
        // Do not wait for a client to finish an already oversized upload.
        void reader.cancel().catch(() => {});
        throw new BodyError(413);
      }
      chunks.push(value);
    }
  } finally { reader.releaseLock(); }
  const bytes = new Uint8Array(size);
  let offset = 0;
  for (const chunk of chunks) { bytes.set(chunk, offset); offset += chunk.byteLength; }
  return JSON.parse(new TextDecoder("utf-8", { fatal: true }).decode(bytes));
}

function isCalendarDate(value: string): boolean {
  if (!DATE_PATTERN.test(value)) return false;
  const date = new Date(`${value}T00:00:00.000Z`);
  return Number.isFinite(date.valueOf()) && date.toISOString().slice(0, 10) === value;
}

/** Reads the request once; only valid results contain an inquiry. */
/** `packages` loads the packages guests can currently ask about (the published content in the route). */
export async function parseContactInput(
  request: Request, packages: () => Promise<readonly BanquetTier[]> = async () => getPrivateEventTiers(),
): Promise<ContactInputResult> {
  const contentType = request.headers.get("content-type")?.split(";")[0].trim().toLowerCase();
  if (contentType !== "application/json") return invalid(415, { error: "Please submit the form as JSON." });
  const submissionKey = request.headers.get("Idempotency-Key");
  if (submissionKey !== null && !SUBMISSION_KEY_PATTERN.test(submissionKey)) {
    return invalid(400, { error: "Invalid submission key." });
  }
  let body: unknown;
  try { body = await readBody(request); }
  catch (error) {
    return error instanceof BodyError && error.status === 413
      ? invalid(413, { error: "The submission is too large." })
      : invalid(400, { error: "Invalid request." });
  }
  if (typeof body !== "object" || body === null || Array.isArray(body)) return invalid(400, { error: "Invalid request." });
  const input = body as Record<string, unknown>;
  if (input.company !== undefined && typeof input.company !== "string") return invalid(400, { error: "Invalid request." });
  // Discard bots without producing data for delivery or future persistence.
  if (typeof input.company === "string" && input.company.trim()) return { kind: "discard" };
  const fields = ["name", "email", "phone", "date", "guests", "message", "event"] as const;
  for (const field of fields) {
    if (input[field] !== undefined && typeof input[field] !== "string") return invalid(400, { error: "Please check the form and try again." });
  }
  const text = (key: (typeof fields)[number]) => typeof input[key] === "string" ? input[key].trim() : "";
  const event = text("event");
  const eventPackage = event && event !== UNDECIDED_EVENT ? snapshotPackage(await packages(), event) : "";
  if (eventPackage === null) return invalid(400, { error: "Please check the form and try again." });
  const enquiry: NormalizedInquiry = {
    name: text("name").replace(/\s+/g, " "), email: text("email"), phone: text("phone"),
    date: text("date"), guests: text("guests"), message: text("message"),
    kind: event ? "event" : "contact", eventPackage,
  };
  if (
    !enquiry.name || enquiry.name.length > 200 || enquiry.email.length > 254 || !EMAIL_PATTERN.test(enquiry.email) ||
    !enquiry.message || enquiry.message.length > 5000 || enquiry.phone.length > 40 || /[\r\n]/.test(enquiry.phone) ||
    (enquiry.date !== "" && !isCalendarDate(enquiry.date)) || (enquiry.guests !== "" && !GUESTS_PATTERN.test(enquiry.guests))
  ) return invalid(400, { error: "Please check the form and try again." });
  return { kind: "valid", inquiry: enquiry, submissionKey };
}
