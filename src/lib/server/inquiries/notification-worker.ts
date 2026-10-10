import "server-only";
import { callRpc, JOB_TAG, type Configuration } from "./persistence";

type Job = { job_id: string; lease_token: string; attempt: number; sender: string; recipient: string;
  reply_to: string; subject: string; body: string };
type Outcome = { outcome: "accepted"; messageId: string } |
  { outcome: "rejected" | "retryable" | "ambiguous"; error: string };
export type WorkerSummary = { claimed: number; accepted: number; deferred: number; lost: number };

export const BATCH_SIZE = 5;
// Worst case 5 × (10s send + 10s store) + claim stays under the route limit and the lease.
const LEASE_SECONDS = 180;
const SEND_TIMEOUT_MS = 10_000;
// A 10,000-character body escapes to at most ~60 KB of JSON; five jobs fit with headroom.
const CLAIM_MAX_BYTES = 512 * 1024;

/** Synthetic seeds and test fixtures use reserved .invalid domains; never send them. */
function isSynthetic(address: string) {
  return /\.invalid>?$/i.test(address.trim());
}

/** Classifies one Resend attempt. The stable key makes every retry within 24 hours a no-op
 * if an earlier attempt was actually accepted.
 */
async function send(job: Job, apiKey: string, fetchImpl: typeof fetch): Promise<Outcome> {
  if (isSynthetic(job.recipient) || isSynthetic(job.sender)) return { outcome: "rejected", error: "synthetic_address" };
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), SEND_TIMEOUT_MS);
  try {
    const response = await fetchImpl("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json",
        "Idempotency-Key": `notification/${job.job_id}` },
      signal: controller.signal,
      body: JSON.stringify({ from: job.sender, to: job.recipient, reply_to: job.reply_to,
        subject: job.subject, text: job.body, tags: [{ name: JOB_TAG, value: job.job_id }] }),
    });
    if (response.ok) {
      const ack: unknown = await response.json().catch(() => null);
      if (ack && typeof ack === "object" && "id" in ack && typeof ack.id === "string" &&
          ack.id.trim() && ack.id.length <= 200) return { outcome: "accepted", messageId: ack.id };
      return { outcome: "ambiguous", error: "invalid_acknowledgment" };
    }
    void response.body?.cancel().catch(() => {});
    if (response.status === 429) return { outcome: "retryable", error: "rate_limited" };
    // Key or domain configuration problems: nothing was sent, so keep retrying until repaired.
    if (response.status === 401 || response.status === 403) return { outcome: "retryable", error: `provider_${response.status}` };
    // 409: same key in flight or already used; an earlier attempt may have been sent.
    if (response.status === 409 || response.status >= 500) return { outcome: "ambiguous", error: `provider_${response.status}` };
    return { outcome: "rejected", error: `provider_${response.status}` };
  } catch {
    return { outcome: "ambiguous", error: controller.signal.aborted ? "provider_timeout" : "provider_unavailable" };
  } finally { clearTimeout(timer); }
}

function isJob(value: unknown): value is Job {
  if (!value || typeof value !== "object") return false;
  const job = value as Record<string, unknown>;
  return ["job_id", "lease_token", "sender", "recipient", "reply_to", "subject", "body"]
    .every((key) => typeof job[key] === "string") && typeof job.attempt === "number";
}

/** Claims one bounded batch and records each outcome. Safe to run concurrently or twice:
 * leases are atomic, and a lost lease means another worker owns the job's outcome.
 */
export async function runNotificationWorker(dependencies: {
  configuration: Configuration; resendApiKey: string; fetch?: typeof fetch; logError: (code: string) => void;
}): Promise<WorkerSummary | null> {
  const { configuration, resendApiKey, logError } = dependencies;
  const fetchImpl = dependencies.fetch ?? fetch;
  const jobs = await callRpc(configuration, "claim_notification_jobs",
    { p_limit: BATCH_SIZE, p_lease_seconds: LEASE_SECONDS }, CLAIM_MAX_BYTES, fetchImpl);
  if (!Array.isArray(jobs) || !jobs.every(isJob)) {
    logError("worker_claim_failed");
    return null;
  }
  const summary: WorkerSummary = { claimed: jobs.length, accepted: 0, deferred: 0, lost: 0 };
  for (const job of jobs) {
    const result = await send(job, resendApiKey, fetchImpl);
    const stored = await callRpc(configuration, "complete_notification_job", {
      p_job_id: job.job_id, p_lease_token: job.lease_token, p_outcome: result.outcome,
      p_provider_message_id: result.outcome === "accepted" ? result.messageId : null,
      p_error: result.outcome === "accepted" ? null : result.error,
    }, 64, fetchImpl);
    if (stored !== true) {
      // Lease expiry recovery will retry with the same idempotency key.
      logError("worker_outcome_not_stored");
      summary.lost++;
    } else if (result.outcome === "accepted") summary.accepted++;
    else {
      logError(`worker_${result.error}`);
      summary.deferred++;
    }
  }
  return summary;
}
