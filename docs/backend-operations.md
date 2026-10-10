# Backend operations (B11)

Status: B11a (health check, structured logs, CI), B11b (backups runbook, local restore drill, retention cleanup) built. Still open: environment separation notes, real restore on a staging project and monitor setup (B12).

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

## Backups and recovery

Facts from Supabase's backup documentation (checked 2026-10-10; re-check prices before purchase):

- Pro keeps the **last 7 daily backups**. Worst case you lose up to a day of inquiries, content edits and photos (photos live in the database, so they are covered).
- Point-in-time recovery (to within about 2 minutes) is an add-on, about $100/month for 7 days, and needs at least the Small compute add-on. Turning it on stops the daily backups. Owner decision: not needed at launch volume unless the restaurant cannot tolerate losing a day of inquiries; the notification email to staff is a second copy of every inquiry.
- Restoring makes the project unavailable while it runs. Daily backups do not keep custom role passwords. Deleting a Supabase project deletes its backups too, so keep the project and add a periodic off-site export (`supabase db dump`) once the owner approves a storage place.
- Supabase Storage files are not in backups; this site stores nothing there.

### Restore drill (done 2026-10-10, local)

Hosted restore cannot be exercised before provisioning. What was exercised: build a database from every migration plus seed, stop it, copy the data directory, start the copy on another port and compare rows (inquiries, jobs, content revisions identical; `ops_snapshot()` runs on the copy). Script: `.local-db-tests/restore-check.mjs` (ignored; recreate from this paragraph). Not covered: a real Supabase dashboard restore (do it on a staging project in B12 before launch) and `pg_dump` (not installed here).

### If data is lost or wrong

1. Pause the worker: remove the cron entry (or unset `CRON_SECRET`) so no mail goes out from a half-restored queue. Pause any retention cleanup.
2. Restore the closest backup before the problem, preferably into a new/staging project first, and look at it.
3. Reconcile the queue: jobs in `leased` or `uncertain` after a restore may already have been sent. Check Resend's log for each; do not blanket-resend. Staff received a copy of every accepted inquiry by email, so compare the inbox with the restored list and re-enter anything missing.
4. Only then switch the live project over and re-enable the worker.

## Retention (owner approved 2026-10-10)

| Data | Kept | Then |
| --- | --- | --- |
| Resolved inquiries, with notes, email jobs, delivery events, status history | 24 months after they were resolved | Deleted together |
| Open inquiries (new / in progress) | Never deleted automatically | n/a |
| Delivery events, duplicate-protection keys | 90 days | Deleted (after 90 days a retried form would count as a new inquiry; retries happen within minutes) |
| Staff role-change history | 24 months | Deleted |
| Content versions, published history, photos | Not deleted | Revisit if the database grows |

How it runs: a daily Vercel Cron (`/api/cron/retention`, 03:17 UTC) calls `public.run_retention()` in batches of 200 until nothing is left or 20 batches. Nothing is deleted unless the environment setting `RETENTION_ENABLED=1` is set, so **switch it on only at release** and pause by removing it. An inquiry with an email still waiting to be sent is never deleted. Deleted rows remain in backups until those expire (7 days on Pro).

## Alerts

Owner chose a free uptime monitor that emails the owner (2026-10-10). Setup is manual and needs an account in the owner's name: create an HTTPS monitor for `https://<site>/api/health`, every 5 minutes, add the header `Authorization: Bearer <CRON_SECRET>`, alert when the status is not 200. Not set up (no deployment yet); do it in B12.

## Environments

| Setting | Local | Preview (Vercel preview deployments) | Production |
| --- | --- | --- | --- |
| `SUPABASE_URL` / `SUPABASE_SECRET_KEY` | Unset, or loopback test database | Separate staging Supabase project (synthetic data only), never the production keys | Production project |
| `RESEND_API_KEY`, `CONTACT_FROM_EMAIL`, `CONTACT_TO_EMAIL` | Unset | Unset: with no Resend key the worker does nothing and jobs wait; addresses ending `.invalid` are never sent | Set at release only |
| `RETENTION_ENABLED` | Unset | Unset | `1` at release |
| `CRON_SECRET`, `RESEND_WEBHOOK_SECRET` | Test values | Own values | Own values |

Set production values only on Vercel's Production scope so previews cannot read them. Vercel runs cron jobs on production deployments only, so previews never send mail or clean data by themselves.
