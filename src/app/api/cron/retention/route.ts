import { callRpc, getPersistenceConfiguration } from "@/lib/server/inquiries/persistence";
import { hasCronSecret, requestLogger } from "@/lib/server/ops";

export const maxDuration = 60;
const BATCHES = 20;

function reply(status: number, body: Record<string, unknown>) {
  return Response.json(body, { status, headers: { "Cache-Control": "no-store" } });
}

/** Daily Vercel Cron (vercel.json). Runs only while RETENTION_ENABLED=1, so pausing is one setting.
 * Deletes in small batches until nothing is left or BATCHES is reached; the next day continues. */
export async function GET(request: Request) {
  if (!hasCronSecret(request)) return reply(401, { error: "Unauthorized" });
  if (process.env.RETENTION_ENABLED !== "1") return reply(200, { skipped: "disabled" });
  const configuration = getPersistenceConfiguration();
  if (!configuration) return reply(503, { error: "Not configured." });
  const total = { inquiries: 0, deliveryEvents: 0, submissionKeys: 0, auditEvents: 0 };
  for (let i = 0; i < BATCHES; i++) {
    const result = await callRpc(configuration, "run_retention", { p_limit: 200 }, 1024);
    if (!result || typeof result !== "object") {
      requestLogger("retention", request)("retention_failed");
      return reply(503, { error: "Cleanup could not run.", done: total });
    }
    let more = 0;
    for (const key of Object.keys(total) as (keyof typeof total)[]) {
      const n = (result as Record<string, unknown>)[key];
      if (typeof n === "number") { total[key] += n; more += n; }
    }
    if (more === 0) break;
  }
  return reply(200, total);
}
