import { getPersistenceConfiguration } from "@/lib/server/inquiries/persistence";
import { hasCronSecret, requestLogger } from "@/lib/server/ops";
import { runNotificationWorker } from "@/lib/server/inquiries/notification-worker";

// Below the worker lease (180s) so a killed run never overlaps its own lease.
export const maxDuration = 150;

function reply(status: number, body: Record<string, unknown>) {
  return Response.json(body, { status, headers: { "Cache-Control": "no-store" } });
}

/** Vercel Cron sends `Authorization: Bearer $CRON_SECRET`. Scheduled every minute in vercel.json. */
export async function GET(request: Request) {
  if (!hasCronSecret(request)) return reply(401, { error: "Unauthorized" });
  const configuration = getPersistenceConfiguration();
  const resendApiKey = process.env.RESEND_API_KEY?.trim();
  if (!configuration || !resendApiKey) return reply(503, { error: "Worker is not configured." });
  const summary = await runNotificationWorker({ configuration, resendApiKey,
    logError: requestLogger("notification_worker", request) });
  return summary ? reply(200, summary) : reply(503, { error: "Jobs could not be claimed." });
}
