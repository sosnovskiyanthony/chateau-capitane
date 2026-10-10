import { parseContactInput } from "./inquiries/contact-input";
import type { Configuration, recordContactInquiry } from "./inquiries/persistence";

type ContactConfiguration = { persistence: Configuration | null; from?: string; to: string };

export type ContactDependencies = {
  getConfiguration: () => ContactConfiguration;
  record: typeof recordContactInquiry;
  logError: (code: string) => void;
};

function reply(status: number, body: Record<string, unknown>) {
  return Response.json(body, { status, headers: { "Cache-Control": "no-store" } });
}

/** Records an inquiry and its notification job; 202 means stored for staff follow-up, never a booking.
 * Email is sent later by the notification worker (src/app/api/cron/notifications).
 */
export async function handleContact(request: Request, dependencies: ContactDependencies): Promise<Response> {
  const input = await parseContactInput(request);
  if (input.kind === "invalid") return reply(input.status, { error: input.error });
  // Same reply as a recorded inquiry so bots cannot tell they were discarded.
  if (input.kind === "discard") return reply(202, { ok: true });
  const configuration = dependencies.getConfiguration();
  const from = configuration.from?.trim();
  const to = configuration.to.trim();
  if (!configuration.persistence || !from || !to) {
    dependencies.logError("contact_not_configured");
    return reply(503, { error: "The form is unavailable right now." });
  }
  const result = await dependencies.record(input.inquiry, input.submissionKey, { from, to },
    { configuration: configuration.persistence });
  if (result.kind === "recorded") return reply(202, { ok: true });
  if (result.kind === "conflict") {
    dependencies.logError("contact_key_conflict");
    return reply(409, { error: "This submission changed. Please send it again." });
  }
  // May follow a commit; an unchanged retry with the same key is deduplicated.
  dependencies.logError("contact_storage_unavailable");
  return reply(503, { error: "The message could not be confirmed. Please try again or call us." });
}
