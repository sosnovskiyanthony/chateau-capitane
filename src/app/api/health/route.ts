import { getPersistenceConfiguration } from "@/lib/server/inquiries/persistence";
import { hasCronSecret, readiness } from "@/lib/server/ops";

const headers = { "Cache-Control": "no-store" };

/** Public: "the site is up", no storage touched. With `Authorization: Bearer $CRON_SECRET`:
 * readiness (queue age, failed jobs, delivery problems); 503 unless everything is fine,
 * so any uptime monitor that checks the status code can alert. */
export async function GET(request: Request) {
  if (!hasCronSecret(request)) return Response.json({ ok: true }, { headers });
  const result = await readiness(getPersistenceConfiguration());
  return Response.json(result, { status: result.status === "ok" ? 200 : 503, headers });
}
