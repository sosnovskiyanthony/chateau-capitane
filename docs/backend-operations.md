# Backend operations (B11)

Status: B11a built (health check, structured logs, CI). Still open: retention decision and cleanup, backup/restore runbook and isolated restore, alert destination, environment separation notes (B11b/c).

## Health check

`GET /api/health`

- No credentials: `200 {"ok":true}`. Proves only that the site is running; touches no storage.
- `Authorization: Bearer $CRON_SECRET`: reads `public.ops_snapshot()` (counts and ages only, no guest data) and answers `200` when healthy, `503` otherwise, with `status` (`ok` / `attention` / `down`), `problems` and the numbers.

Point an uptime monitor at it with that header; it alerts on any non-200. Problem codes:

| Code | Meaning | First action |
| --- | --- | --- |
| `storage_unreachable` | Database did not answer (or is not configured) | Check Supabase status and `SUPABASE_URL` / `SUPABASE_SECRET_KEY`. Guests see the phone-number fallback; nothing is lost that was acknowledged. |
| `notification_queue_stale` | A staff email has been due for over 10 minutes | Check the Vercel cron ran (`/api/cron/notifications`), `RESEND_API_KEY`, `CRON_SECRET`. Jobs wait safely and retry. |
| `notification_jobs_failed` / `_uncertain` | Email rejected, out of attempts, or may have been sent | Open the inquiry in the staff inbox (the guest message is stored) and follow up by phone/email; check Resend's log for the job. |
| `email_delivery_problems` | A bounce, failure, suppression or complaint in the last 7 days | Check the staff address in Resend. |
| `delivery_event_backlog` | Over 5,000 delivery events that match no job | Check `RESEND_WEBHOOK_SECRET` and the Resend webhook; unmatched events are cleaned by the retention step once approved. |

The snapshot also reports `inquiries24h` and `loginHitsNow` (active sign-in attempt counters; a sudden jump means password guessing, which is already rate limited).

## Logs

Failures in contact intake, the notification worker and the Resend webhook print one JSON line: `{"level":"error","source":...,"code":...,"requestId":...}`. `requestId` is Vercel's `x-vercel-id` (visible in Vercel's request log) so a log line can be matched to one request. The `code` is a fixed word; guest text, addresses and keys are never logged.

## CI

`.github/workflows/ci.yml` runs on every push and pull request: install from the lockfile, lint, unit tests, database tests (throw-away embedded PostgreSQL with every migration; no hosted database), production build. Not yet run on GitHub (nothing is pushed); first push shows whether the Linux database binaries start there.
