# Next backend session

Updated: 2026-10-09. Canonical rolling handoff.

## Objective and starting task

Claude Code now builds (rules: [CLAUDE.md](CLAUDE.md), evidence: [docs/claude-workflow.md](docs/claude-workflow.md)); Codex reviews later. Follow [the backend roadmap](docs/plans/backend-roadmap.md), **Research → Plan → Build → Verify**. B01 complete; B02a/b committed (`a12f3f0`); dependency security slice done (Next 16.4.0).

**Start here: B03b** — switch public intake to durable storage. Route calls `recordContactInquiry` and answers `202 { ok: true }` ("recorded for staff follow-up") only after commit; update the form text and API tests together; add the `vercel.json` cron (`* * * * *` → `/api/cron/notifications`); document key retention (keys stay reserved until B11 retention policy, never reused) and keyless behaviour; remove the direct Resend send from `src/lib/server/contact.ts` (avoid two Resend clients). Local only: no live mail, deploy or provisioning.

B03a done 2026-10-09 (worker, inactive): scheduler confirmed as Vercel Cron (Bearer `CRON_SECRET`, best-effort, may double-fire, no retries) — the lease design tolerates all three. See "Notification worker" in [supabase/README.md](supabase/README.md).

Owner decision 2026-10-09: **work without virtualization for now.** Do not ask about it or try Docker. B02c (full Supabase gateway/Auth check) stays blocked and must be done before any release. When the owner enables BIOS virtualization: install WSL2 + Docker Desktop (`winget install Docker.DockerDesktop`) and the Supabase CLI, then run B02c and re-run B03+ integration through the gateway.

1. Check Git state; preserve unrelated benchmark traces (never commit them). Read [B02 results](docs/plans/b02-persistence.md) and [persistence instructions](supabase/README.md). Do not repeat B01/provider research.
2. Provider selection resolved: owner delegated online research, selection and local building. Vercel Pro + Supabase Pro PostgreSQL/Auth, Vercel `iad1` / Supabase specific `us-east-1`, company-owned accounts, ~$45/month base before extras. [Evidence and alternatives](docs/plans/backend-provider-decision.md). No paid provisioning, push, deployment, live migration or real mail is authorized.
3. Native PostgreSQL tooling is installed and verified. Docker/Supabase CLI remain unavailable. Establish a full disposable local Supabase stack if compatible container tooling can be installed. Never reset remote targets or count standalone PostgreSQL as gateway/Auth evidence.
4. B02c must apply migrations through the supported Supabase workflow and exercise the RPC through the gateway with server/anonymous/authenticated keys. Keep private schema unexposed. Staff access stays closed until B06 membership; metadata cannot grant access. B02 remains incomplete until integration is checked.
5. Keep contact route on direct email until B03 worker, acknowledgment, key policy and tests are ready. Never deliver synthetic jobs.
6. Dependencies: Next/eslint-config-next 16.4.0 fixed the critical next/og RCE; `npm audit --omit=dev` reports 0. Five high remain in the dev-only ESLint glob chain with no upstream fix; recheck before release. Docker blocked 2026-10-09: firmware virtualization disabled, WSL not installed.

## Completed and verified

- B03a: `supabase/migrations/202610090002_notification_worker.sql` (lease columns, column-limited update grant, `claim_notification_jobs`/`complete_notification_job` RPCs), `src/lib/server/inquiries/notification-worker.ts`, `src/app/api/cron/notifications/route.ts`, shared bounded `callRpc` in `persistence.ts`, `tests/notification-worker.test.mjs`, worker cases in `tests/db/persistence.test.mjs`. 2026-10-09: `npm.cmd test` **53/53**, `npm.cmd run test:db` **11 cases + parent** passed (concurrent claims disjoint, lease-token enforcement, backoff, crash recovery, 8-attempt and 23-hour limits → failed/uncertain, role denial); lint and build passed; `/code-review` fixes applied (claim byte bound, 401/403 retryable, limits repeated in claim). Cron route not exercised over HTTP (simple bearer check; unit-tested worker only). Known ceiling: expired lease counts as "maybe sent" even if the crash preceded sending (`ponytail:` note in migration).

- B01 parsing contract is in baseline `dbd290f`; only valid results expose six normalized readonly strings.
- B02a/b: `supabase/migrations/202610090001_inquiry_foundation.sql`, synthetic `supabase/seed.sql`, `src/lib/server/inquiries/persistence.ts`, `tests/persistence.test.mjs`, `tests/db/persistence.test.mjs`, server-only env settings and docs. One invoker RPC atomically claims key, inserts inquiry and snapshots notification. Database SHA-256 fingerprints fixed inquiry fields and notification configuration/version. UUID key case deduplicates; changed payload conflicts. No expiry/cleanup/reuse policy yet.
- Private grants and RLS deny anonymous/authenticated/claimed staff. Service role has private select/insert grants; job payload is immutable. Calendar strings retain ISO year zero accepted by B01. No worker/Auth/admin exists.
- 2026-10-09: `npm.cmd test` **48/48 passed**; `npm.cmd run test:db` **eight behavior cases plus parent passed** on native PostgreSQL 17.10. Empty rebuild/seeds, reconnect, concurrent retry/conflict, rollback with lock-blocked competitor, keyless calls, constraints, immutable payload, grants and independent RLS denial checked. Full Supabase gateway/Auth integration **unrun**.
- Lint and production build passed. Initial sandbox test/build `spawn EPERM` resolved by approved escalation. Existing parent-directory lockfile build warning remains. No UI changes or live email/hosted DB.
- Pinned dev-only embedded-postgres/pg; runtime server-only. DB tests use unique ignored `.local-db-tests/run-*`, random passwords/ports, loopback and no external connection URL. Clusters stop after tests; fixtures remain for diagnosis. `.npm-cache/` also ignored.

## Constraints and Git

- Preserve OpenTable Book now and all Call buttons. Inquiries never confirm bookings. Lunch: three courses, beverages excluded. New photos: verified 2026 posts with provenance; existing assets remain.
- Current form retries share a UUID only while mounted; Resend deduplication lasts 24 hours. Persistence remains inactive.
- Branch `codex/backend-foundation`; origin `https://github.com/sosnovskiyanthony/chateau-capitane`. Approved local baseline `dbd290f` verified. B02 code/docs and unrelated raw benchmark traces uncommitted. Commit only when asked; push/deployment unauthorized.
- Operator decisions needed before B06; retention before B11. No provider decision is pending for local work.

## Reset protocol

Update this file and roadmap after verified slices; keep missing checks explicit. `HANDOFF.md` remains a pointer. This local checkpoint is ready for clearing context.

Fresh-session prompt: **Read next.md and continue.**
