# Inquiry persistence (B02)

This directory contains an inactive PostgreSQL foundation for Supabase. Public contact intake still sends directly through Resend. No database worker, staff access, hosted project or live migration exists yet.

`migrations/202610090001_inquiry_foundation.sql` creates the private `inquiry_private` schema and one exposed RPC, `public.record_contact_inquiry`. Do not add the private schema to Supabase's exposed API schemas. The RPC uses invoker privileges; only `service_role` has execute permission and private select/insert grants. Tables have RLS with no staff policies. B06 must supply trusted membership and authorization before staff access is granted; client metadata claiming an owner role grants nothing.

## Local verification

Run `npm.cmd run test:db` (or `npm run test:db` outside PowerShell). Development-only `embedded-postgres` supplies pinned PostgreSQL 17.10 binaries. The runner creates a unique ignored `.local-db-tests/run-*` cluster, selects an ephemeral port and listens only on `127.0.0.1` with a random password. It ignores external database URLs, creates fresh test databases and stops its own cluster after the suite. Generated fixtures are retained for diagnosis; the runner does not recursively delete directories. No machine service or host user is installed. Install scripts required by the package may need approval under your npm policy.

The harness creates the three Supabase role names for SQL tests. It proves migration rebuild, seeds, reconnect persistence, constraints, concurrent key claims/conflicts, transaction rollback, immutable job payloads, grants and deny-by-default RLS. It **does not** run Supabase's API gateway, Auth, CLI migrations or hosted infrastructure. Those integration checks remain B02c before durable intake activation. No remote reset is part of this workflow.

`seed.sql` uses only synthetic `.invalid` mail addresses and is repeatable through its fixed key. It creates a pending job but sends no email. Never seed production; future workers must be configured against the intended environment and synthetic jobs must never be delivered.

## Server contract

`src/lib/server/inquiries/persistence.ts` is marked `server-only`. Configure `SUPABASE_URL` and `SUPABASE_SECRET_KEY` in ignored environment files or provider secrets. New Supabase secret keys are sent in `apikey`; they are not bearer JWTs. The current module accepts `sb_secret_` keys and HTTPS (HTTP only for loopback development). It makes one no-store POST with a bounded response and ten-second timeout. It never logs provider bodies, retries automatically or exposes credentials.

Pass only a valid `NormalizedInquiry`, an optional UUID v4 key and server-controlled notification sender/recipient. The database snapshots sender/recipient/reply-to/subject/body with payload version 1. Its SHA-256 fingerprint uses a fixed-order JSON array of inquiry fields, endpoint and notification payload/version. UUID storage canonicalizes key case. Matching retries return the original internal inquiry ID; changed payload or delivery configuration returns `conflict` with no writes. That ID must not be included in public retry replies.

Keyless requests create separate units. Key retention (B03b): keys stay reserved indefinitely until the B11 retention policy and are never reused or released; a reused key with a different payload returns `conflict` (HTTP 409). Keyless requests are each a new inquiry, so a lost acknowledgment followed by a keyless retry can create a duplicate; the site form always sends a key. Dates remain validated `YYYY-MM-DD` strings, including ISO year 0000 accepted by the current parser; no timezone conversion occurs. Timestamps use `timestamptz`. No inquiry/key/job is committed when a write fails. A lost HTTP acknowledgment may follow a commit, so the caller returns `unavailable`; retry using the original key to resolve uncertainty. Keyless callers cannot resolve this safely through deduplication.

Staff membership: see "Staff access (B06)" below. No retention cleanup is implemented. [Provider decision](../docs/plans/backend-provider-decision.md), [B02 progress](../docs/plans/b02-persistence.md).

## Notification worker

`migrations/202610090002_notification_worker.sql` adds lease/outcome columns, a column-limited service-role update grant and two service-role RPCs. `claim_notification_jobs(limit, lease_seconds)` atomically leases due pending jobs and expired leases with `FOR UPDATE SKIP LOCKED`, so concurrent or duplicate cron runs never share a job. `complete_notification_job(id, lease_token, outcome, message_id, error)` stores one outcome only while the caller still holds the lease; otherwise it returns false.

Outcomes: `accepted` (Resend message ID), `rejected` (permanent 4xx), `retryable` (429/401/403: not sent), `ambiguous` (timeout, lost response, 409, 5xx, invalid acknowledgment: may have been sent). Retries back off 1, 2, 4 … 60 minutes. Every attempt sends `Idempotency-Key: notification/<job id>`, which Resend honours for 24 hours. After eight attempts or 23 hours since the first attempt the job ends as `failed` (never possibly sent) or `uncertain` (an attempt may have been sent; reconcile manually or via B04 webhooks, never resend blindly). An expired lease counts as possibly sent.

`src/lib/server/inquiries/notification-worker.ts` claims at most five jobs per run and never sends to `.invalid` addresses (synthetic seeds/tests). `GET /api/cron/notifications` requires `Authorization: Bearer $CRON_SECRET` (Vercel Cron's format) and returns counts only. B03b: `vercel.json` schedules it every minute and `POST /api/contact` now only records inquiries (no direct send). To pause delivery, unset `CRON_SECRET` or remove the cron; the backlog stays pending. Never restore direct sends while jobs exist (duplicates).

## Delivery webhooks

`POST /api/webhooks/resend` (`src/lib/server/inquiries/delivery-webhook.ts`) reads at most 64 KiB of raw body, verifies the Svix signature Resend uses (`svix-id`, `svix-timestamp` within five minutes, any `v1` HMAC-SHA256 under `RESEND_WEBHOOK_SECRET`), then stores sent/delayed/delivered/bounced/failed/suppressed/complained events. Opens, clicks, inbound mail and non-email events are acknowledged and ignored. Tests sign fixtures with the official `svix` library (dev-only) to prove the hand-written check agrees with it.

`migrations/202610090003_delivery_events.sql` adds `delivery_events` (Svix ID primary key, type, Resend email ID, matched job, event time; no addresses or text) and `record_delivery_event`, which returns `recorded`, `duplicate` or `overflow`. Every worker send carries the tag `notification_job=<job id>`, so an event finds its job even when the send response was lost: a leased, pending, `uncertain` or `failed` job becomes `accepted` with that email ID (a worker reporting afterwards gets `true`, and a crashed lease is never resent). The Resend email ID wins over the tag; a tag is trusted only for a job with no message ID yet. Untagged mail matching no job (other senders on the account) is acknowledged as `unrelated` and not stored; a tagged event that matches no job is stored unmatched and never attached. `accepted` only means Resend took the request; delivery comes from the `job_delivery_status` view (highest of sent < delayed < delivered < bounced/failed/suppressed < complained), so duplicates and out-of-order events cannot regress it.

Unmatched tagged events are capped at 10,000; above that, and whenever storage is unreachable or unconfigured, the route answers 503 and Resend retries for about 27 hours (then events can be replayed from the Resend dashboard). To stop processing, unset `RESEND_WEBHOOK_SECRET` (503, events queue at Resend) or disable the endpoint in Resend. Unmatched-event review and expiry belong to B07/B11.

## Contact rate limits (B05)

`migrations/202610090004_contact_rate_limits.sql` adds `rate_limit_hits` (fixed-window counters) and `check_contact_limit(subject, key, subject_limit, subject_seconds, global_limit, global_seconds)`. Every Vercel instance counts in the same table, so limits hold across instances. `POST /api/contact` calls it after the cheap local checks (size, JSON, fields, honeypot; those never touch the database) and before storage.

- **Client identity.** Only `x-vercel-forwarded-for`, which Vercel sets itself and documents as not overwritable by a proxy in front. `x-forwarded-for`, `x-real-ip` and `forwarded` are ignored. IPv6 is grouped by /64; IPv4-mapped IPv6 counts as IPv4. Off Vercel (`VERCEL` not `1`) nothing is trusted and all requests share one "unattributed" bucket, so local or self-hosted runs cap the whole site at the per-client limit.
- **Stored data.** Only `subject:<HMAC-SHA256 of the network>` (keyed with the Supabase secret key; rotating it resets the counters) or `global`, a window start/end and a count. No raw address. Expired windows are deleted on later calls.
- **Thresholds** (`CONTACT_LIMITS` in `src/lib/server/inquiries/abuse-limit.ts`, passed per call so tuning needs no migration): 5 accepted-for-checking submissions per client network per 10 minutes, 60 per hour site-wide. These are starting values for a restaurant form that sees a few messages a day, not tuned figures. Raise them if `contact_rate_limited` appears for real guests. Trade-off: the site-wide cap bounds storage and staff email during a distributed flood, but a few networks can fill it; guests then see the phone number.
- **Retries.** A request whose `Idempotency-Key` is already recorded skips counting (it cannot add a job). Attempts that end in 409 or 503 still count.
- **Replies.** Over a limit: `429` with `Retry-After` (seconds to the window end) and a "call us" message. Limiter unreachable or any unexpected reply: fail closed with `503` and the phone fallback (`contact_limiter_unavailable`), never unlimited acceptance. Both are logged as static codes; B11 monitoring should alert on them.
- **Not included.** Invalid or oversized requests are rejected without counting; floods of those are left to Vercel's firewall. No CAPTCHA until observed abuse warrants one.

## Staff access (B06)

`migrations/202610100001_staff_access.sql` adds `staff_members` (user ID, role `owner` or `staff`) and `public.staff_role(user)`. `service_role` can only **read** it: rows are added, changed or removed only by the database owner (Supabase SQL editor or a migration), so no website request and no staff member can grant or change a role. Auth user metadata (`user_metadata`/`app_metadata`) is never consulted. It also adds `check_login_limit`, which reuses the B05 counters under `login:<HMAC>` buckets (10 sign-in or email-link attempts per client network per 15 minutes, `LOGIN_LIMIT` in `src/lib/server/auth/staff-auth.ts`; fails closed).

Code: `src/lib/server/auth/staff-auth.ts` (Supabase Auth REST calls over fetch, no client library), `src/lib/server/auth/session.ts` (cookies, `requireStaff`), `src/app/admin/` (pages, Server Functions, `/admin/refresh`).

- **Session.** Tokens live only in `httpOnly`, `SameSite=Lax`, `Path=/admin` cookies (`Secure` in production); page scripts cannot read them and public pages never receive them. The access cookie ends a minute before the token; `/admin/refresh` then renews it with the refresh token and returns to the page. 12 idle hours end the sign-in.
- **Every page and action** calls `requireStaff`, which asks Supabase Auth to confirm the session (`GET /auth/v1/user`; signed-out or deleted sessions fail there) and re-reads `staff_role`. Removing a row therefore blocks the person on their next page load or action. A rejected or revoked session is sent to `/admin/refresh?end=1`, which revokes it at Supabase and clears the cookies. Admin responses are `no-store` and `noindex`.
- **Sign-out** revokes the session at Supabase using the refresh token, so it works after the access cookie has expired.
- **CSRF.** Sign-in, password and sign-out are Next.js Server Functions (POST only; Next.js rejects a mismatched `Origin`).
- **Sign-in errors** use one message for wrong password, unknown email and non-staff accounts. A non-staff account that authenticates is signed straight out and receives no cookies.

Setup at provisioning (needs owner authorization because it sends real email):

1. Supabase Dashboard → Authentication → Sign In / Providers: turn **off** "Allow new users to sign up". Keep email provider on. Optionally set a session inactivity timeout.
2. Authentication → URL Configuration: Site URL = the production site.
3. Authentication → Email Templates, **Invite user** and **Reset password**: change the link to `{{ .SiteURL }}/admin/confirm?token_hash={{ .TokenHash }}&type=invite` (use `type=recovery` for reset). Opening the page changes nothing; the single-use token is spent only when the person submits a new password (at least 12 characters), so mail scanners cannot consume it. A rejected password still spends the link; send a new one.
4. Invite the person (Authentication → Users → Invite), then grant access in the SQL editor: `insert into inquiry_private.staff_members (user_id, role) values ('<user id>', 'staff');` (`'owner'` for the owner).

Revoke: `delete from inquiry_private.staff_members where user_id = '<user id>';` (takes effect on their next request; no data is removed). To also end their sessions, sign the user out or delete them under Authentication → Users. Emergency: deleting all rows closes the admin area for everyone.

Not included yet: a "forgot password" form (the owner sends resets from the dashboard), multi-factor sign-in, and role management in the site (deliberately SQL-only). Login limits count per network; Supabase's own Auth limits see only the server's address, so heavy failed sign-ins from many networks can still trip them for everyone.

## Staff inbox (B07)

`migrations/202610100002_staff_inbox.sql` adds an inquiry `version`, append-only `inquiry_notes` (1–2000 characters, at most 100 per inquiry) and `audit_events` (status changes, plus role grants/changes/revocations recorded by a trigger on `staff_members`; IDs, statuses, roles and staff email only, never guest text). Four service-role functions back `/admin/inquiries`: `staff_list_inquiries` (newest first, status filter, name/email substring search with wildcards escaped, keyset pages of 25), `staff_get_inquiry` (detail, notification state, notes, latest 200 history rows), `staff_set_inquiry_status` and `staff_add_inquiry_note`. Each takes the staff user ID resolved by `requireStaff` and re-checks membership in the database.

- **Statuses.** new → in progress → resolved; new may go straight to resolved; resolved only reopens to in progress. A change must carry the version the editor saw: a stale version returns `stale`, changes nothing, and the page says someone else changed it.
- **Write path.** The server key has no direct update/insert rights on status, notes or audit; only the two security-definer functions write them, so every status change is checked and audited.
- **Delivery problems** (bounced, failed, suppressed, complained, delayed, retrying, uncertain, failed send, missing job) are marked "Attention" in the list and detail.
- **Privacy.** Pages are dynamic and sent `Cache-Control: private, no-store`; RPC calls use `cache: "no-store"`; nothing logs inquiry text. Replies go out through staff's own email/phone (mailto/tel links); automatic replies are out of scope.
- **Recovery (read-only inbox).** As the database owner: `revoke execute on function public.staff_set_inquiry_status(uuid, text, uuid, integer, text), public.staff_add_inquiry_note(uuid, text, uuid, text) from service_role;` Reading continues; actions show "could not be saved". Grant execute back to restore.
- **Volume.** Search is a sequential scan, fine for thousands of inquiries; add `pg_trgm` indexes if it grows far beyond that.
