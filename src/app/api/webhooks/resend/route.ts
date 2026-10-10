import { getPersistenceConfiguration } from "@/lib/server/inquiries/persistence";
import { handleResendWebhook } from "@/lib/server/inquiries/delivery-webhook";

/** Resend delivery events, signed with the endpoint's `whsec_` secret (RESEND_WEBHOOK_SECRET). */
export async function POST(request: Request) {
  const { status, body } = await handleResendWebhook(request, {
    configuration: getPersistenceConfiguration(),
    secret: process.env.RESEND_WEBHOOK_SECRET?.trim(),
    logError: (code) => console.error("Resend webhook:", code),
  });
  return Response.json(body, { status, headers: { "Cache-Control": "no-store" } });
}
