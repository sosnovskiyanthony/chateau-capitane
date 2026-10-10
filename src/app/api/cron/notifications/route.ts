import { createHash, timingSafeEqual } from "node:crypto";
import { getPersistenceConfiguration } from "@/lib/server/inquiries/persistence";
import { runNotificationWorker } from "@/lib/server/inquiries/notification-worker";

// Below the worker lease (180s) so a killed run never overlaps its own lease.
export const maxDuration = 150;

function reply(status: number, body: Record<string, unknown>) {
  return Response.json(body, { status, headers: { "Cache-Control": "no-store" } });
}

/** Vercel Cron sends `Authorization: Bearer $CRON_SECRET`. Scheduled every minute in vercel.json. */
export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET?.trim();
  const digest = (value: string) => createHash("sha256").update(value).digest();
  if (!secret || secret.length < 16 ||
      !timingSafeEqual(digest(request.headers.get("authorization") ?? ""), digest(`Bearer ${secret}`))) {
    return reply(401, { error: "Unauthorized" });
  }
  const configuration = getPersistenceConfiguration();
  const resendApiKey = process.env.RESEND_API_KEY?.trim();
  if (!configuration || !resendApiKey) return reply(503, { error: "Worker is not configured." });
  const summary = await runNotificationWorker({ configuration, resendApiKey,
    logError: (code) => console.error("Notification worker:", code) });
  return summary ? reply(200, summary) : reply(503, { error: "Jobs could not be claimed." });
}
