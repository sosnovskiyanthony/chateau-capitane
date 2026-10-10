import "server-only";
import { createHash, randomUUID, timingSafeEqual } from "node:crypto";
import { callRpc, type Configuration } from "./inquiries/persistence";

/** Bearer `CRON_SECRET` check shared by the cron worker and the readiness check. */
export function hasCronSecret(request: Request, env: NodeJS.ProcessEnv = process.env) {
  const secret = env.CRON_SECRET?.trim();
  const digest = (value: string) => createHash("sha256").update(value).digest();
  return !!secret && secret.length >= 16 &&
    timingSafeEqual(digest(request.headers.get("authorization") ?? ""), digest(`Bearer ${secret}`));
}

/** One JSON line per problem, tied to the request. `code` must be a fixed word, never guest text. */
export function requestLogger(source: string, request: Request) {
  const requestId = request.headers.get("x-vercel-id") ?? randomUUID();
  return (code: string) => console.error(JSON.stringify({ level: "error", source, code, requestId }));
}

// Mail that should have gone out minutes ago but has not is the failure owners notice first.
export const STALE_QUEUE_SECONDS = 600;
type Snapshot = { jobs: Record<string, number>; oldestDueJobSeconds: number; deliveryProblems7d: number;
  unmatchedDeliveryEvents: number; inquiries24h: number; loginHitsNow: number };

/** Turns a database snapshot into plain problem codes; empty means healthy. */
export function findProblems(s: Snapshot): string[] {
  const problems: string[] = [];
  if (s.oldestDueJobSeconds > STALE_QUEUE_SECONDS) problems.push("notification_queue_stale");
  if ((s.jobs.failed ?? 0) > 0) problems.push("notification_jobs_failed");
  if ((s.jobs.uncertain ?? 0) > 0) problems.push("notification_jobs_uncertain");
  if (s.deliveryProblems7d > 0) problems.push("email_delivery_problems");
  if (s.unmatchedDeliveryEvents > 5000) problems.push("delivery_event_backlog");
  return problems;
}

/** Readiness: reads the snapshot (counts only). `down` = storage unreachable. */
export async function readiness(configuration: Configuration | null, fetchImpl?: typeof fetch) {
  const raw = configuration ? await callRpc(configuration, "ops_snapshot", {}, 4096, fetchImpl) : undefined;
  if (!raw || typeof raw !== "object" || !("jobs" in raw)) return { status: "down" as const, problems: ["storage_unreachable"] };
  const snapshot = raw as Snapshot;
  const problems = findProblems(snapshot);
  return { status: problems.length ? "attention" as const : "ok" as const, problems, snapshot };
}
