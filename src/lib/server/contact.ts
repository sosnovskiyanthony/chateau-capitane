import { parseContactInput } from "./inquiries/contact-input";

type ContactConfiguration = { apiKey?: string; from?: string; to: string };

export type ContactDependencies = {
  getConfiguration: () => ContactConfiguration;
  fetch: typeof fetch;
  logError: (code: string, status?: number) => void;
  timeoutMs?: number;
};

function reply(status: number, body: Record<string, unknown>) {
  return Response.json(body, { status, headers: { "Cache-Control": "no-store" } });
}

/** Handles inquiry submission; email acceptance does not confirm a reservation. */
export async function handleContact(request: Request, dependencies: ContactDependencies): Promise<Response> {
  const input = await parseContactInput(request);
  if (input.kind === "invalid") return reply(input.status, { error: input.error });
  if (input.kind === "discard") return reply(200, { ok: true });
  const { inquiry: enquiry, submissionKey } = input;
  const configuration = dependencies.getConfiguration();
  if (!configuration.apiKey?.trim() || !configuration.from?.trim() || !configuration.to.trim()) {
    dependencies.logError("contact_not_configured");
    return reply(503, { error: "The form is unavailable right now." });
  }
  const details = [
    `Name: ${enquiry.name}`, `Email: ${enquiry.email}`,
    enquiry.phone ? `Phone: ${enquiry.phone}` : null, enquiry.date ? `Date: ${enquiry.date}` : null,
    enquiry.guests ? `Guests: ${enquiry.guests}` : null,
  ].filter((line) => line !== null);
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), dependencies.timeoutMs ?? 10_000);
  try {
    const response = await dependencies.fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${configuration.apiKey.trim()}`,
        "Content-Type": "application/json",
        ...(submissionKey ? { "Idempotency-Key": `contact/${submissionKey}` } : {}),
      },
      signal: controller.signal,
      body: JSON.stringify({
        from: configuration.from.trim(), to: configuration.to.trim(), reply_to: enquiry.email,
        subject: `Enquiry from ${enquiry.name}`, text: [...details, "", enquiry.message].join("\n"),
      }),
    });
    if (!response.ok) {
      dependencies.logError("contact_provider_rejected", response.status);
      void response.body?.cancel().catch(() => {});
      return reply(502, { error: "The message could not be sent." });
    }
    const acknowledgment: unknown = await response.json();
    if (typeof acknowledgment !== "object" || acknowledgment === null || !("id" in acknowledgment) ||
        typeof acknowledgment.id !== "string" || !acknowledgment.id.trim()) {
      dependencies.logError("contact_invalid_acknowledgment");
      return reply(502, { error: "The message could not be confirmed." });
    }
    return reply(200, { ok: true });
  } catch {
    dependencies.logError(controller.signal.aborted ? "contact_provider_timeout" : "contact_provider_unavailable");
    return reply(controller.signal.aborted ? 504 : 502, { error: "The message could not be confirmed. Please call us before resending." });
  } finally { clearTimeout(timer); }
}
