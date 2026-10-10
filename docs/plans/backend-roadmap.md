# Backend implementation roadmap

Updated: 2026-10-09. B01 verified; B02a/b locally verified, B02c Supabase integration next. Provider selection resolved.

This is the durable plan. [next.md](../../next.md) is the concise rolling handoff. Follow **Research → Plan → Build → Verify** for each slice; read the relevant section rather than loading the entire project history.

## Outcome and boundaries

Build reliable guest-inquiry storage and notifications, a protected staff inbox and event workflow, controlled restaurant content/photo management, and production monitoring and recovery.

Completion means valid submissions survive restarts, concurrent retries do not duplicate records, notification failures remain visible and recoverable, unauthorized users cannot access guest data or change content, published content reaches the website, and the owner has tested operating instructions.

OpenTable remains the source of table availability and confirmed reservations. Preserve the existing booking link and all Call buttons. Contact/event submissions request staff follow-up; they never confirm a booking. Lunch remains three courses with beverages excluded. Future downloaded photos must come from verified 2026 posts; preserve provenance. Keep the existing design and unrelated working-tree changes.

Payments, ordering, inventory, a custom booking engine, customer accounts, marketing campaigns and POS integrations require a separate request. They are outside this roadmap.

## Current foundation

- Next 16.3.5, React 19.2.8, TypeScript, Tailwind 4, npm. Read installed `node_modules/next/dist/docs/` before writing framework code.
- `POST /api/contact` validates bounded JSON, discards honeypot submissions, sends through Resend, verifies acknowledgment and returns safe failures. [Implemented API contract](../backend.md).
- The form guards overlapping submits and reuses a UUID key for unchanged retries in the same mounted form. Provider deduplication lasts 24 hours; reload loses the form key.
- Inactive local PostgreSQL inquiry/key/job storage and a server RPC caller now exist. Public intake remains direct email. No worker, staff auth/admin, distributed limiter or content editor exists.
- Current results: 48 application tests, eight real PostgreSQL behavior cases plus parent, lint/build passed. Full Supabase gateway/Auth and live delivery remain unverified.
- Branch `codex/backend-foundation`; baseline `dbd290f` committed. B02 changes and unrelated raw benchmark traces uncommitted; preserve them. Origin `https://github.com/sosnovskiyanthony/chateau-capitane`.

## Research and architecture

Official sources checked 2026-10-08. These establish capabilities and constraints, not a provider performance/cost benchmark.

| Evidence | Design consequence |
| --- | --- |
| [Resend idempotency](https://resend.com/docs/dashboard/emails/idempotency-keys) retains keys for 24 hours. | Durable application deduplication is separate. Stop ambiguous-send retries before protection expires and reconcile before resending. |
| [Resend signature verification](https://resend.com/docs/webhooks/verify-webhooks-requests) requires the original request body and signing secret. | Verify before trusting events; altered payloads fail; deduplicate event IDs. |
| [Resend webhooks](https://resend.com/docs/webhooks/introduction) expose email events and replay tools. | Provider acceptance and final delivery are distinct; replay must be safe. |
| [Supabase RLS](https://supabase.com/docs/guides/database/postgres/row-level-security) combines grants and policies; privileged roles bypass policies. | Keep privileged keys server-only, constrain grants and test allowed/denied access. |
| [Supabase server auth](https://supabase.com/docs/guides/auth/server-side) supports cookie sessions. | Use maintained integration; verify identity and staff permission server-side for each protected operation. |
| [Supabase migrations](https://supabase.com/docs/guides/local-development/database-migrations) support reproducible local schemas and seeds. | Version migrations and synthetic fixtures; verify against a disposable local database before remote application. |
| [Vercel cron](https://vercel.com/docs/cron-jobs/manage-cron-jobs) supports authenticated invocation but runs can be missed or duplicated. | Scheduler triggers work; the database/application must own durable claims, leases, deduplication and backlog monitoring. |

Selected under the owner's delegated selection authority, 2026-10-09: Next.js on Vercel Pro; Supabase Pro PostgreSQL/Auth, with Storage for future media; existing Resend. Co-locate Vercel `iad1` and Supabase `us-east-1`, use company-owned accounts, budget approximately $45/month base before extras. [Research and alternatives](backend-provider-decision.md). Pro cron supports minute-level invocation; worker recovery remains B03. No paid provisioning/deployment occurred.

This recommendation is engineering judgment for a small restaurant site with fewer systems to manage. It is not proof of maximum speed, minimum cost, or permission to provision accounts, buy services, deploy or migrate live data. Keep provider-specific code in focused server modules; avoid a generic multi-provider framework.

### Decisions needed at the point of use

| Decision | Needed before | Proposal, not approval |
| --- | --- | --- |
| Host/database, ownership, budget and region | Resolved for local implementation; paid provisioning separate | Vercel Pro + Supabase Pro, Northern Virginia, company ownership, ~$45/month base; see selected-stack research. |
| Initial operators and invitation/revocation authority | B06 provisioning | Invited owner/staff; no public admin registration. |
| Guest-data, audit and backup retention | B11 deletion automation | Owner chooses periods; do not invent legal requirements or delete real data. |
| Sender, recipient, verified domain and authorized test address | B03 live mail test | Existing Resend; server-controlled recipient. |
| Editable menu/settings/media scope | B09 editor scope | Existing menus, hours, event packages and gallery, seeded from static content. |

Ask only for the decision currently blocking a slice; continue independent local work while waiting. Credentials belong in ignored local environment files or provider secret settings, never chat or committed documents.

## Data and behavior contracts

Use UTC timestamps for jobs/events. Requested event dates remain calendar dates, without timezone conversion; staff displays use the restaurant timezone. Editable prices use integer minor units plus currency.

| Entity | Purpose and constraints |
| --- | --- |
| `inquiries` | UUID, bounded normalized guest fields, inquiry kind, workflow status, timestamps; private, indexed staff listing. |
| `submission_keys` | Unique endpoint/key, canonical payload fingerprint, inquiry reference, expiry. Same payload/key returns the same safe result; changed payload conflicts. |
| `notification_jobs` | Inquiry, unique notification purpose, immutable delivery payload/version, attempts, retry time, lease, provider ID and safe error. Atomic creation with inquiry. |
| `email_events` | Unique provider event ID, message reference, type/time and processing state; minimal payload; support delayed message-ID reconciliation. |
| `staff_members`, `audit_events` | Server-controlled membership/roles and bounded action metadata; staff cannot grant themselves owner access. |
| `event_inquiry_details` | Requested date, party size, event/package context and internal follow-up; linked inquiry, no availability guarantee. |
| `content_revisions` | Validated draft/published restaurant content, editor, version and history; public reads expose published fields only. |
| `media_assets` | Safe storage key, image dimensions/type, alt text, provenance/date and publication state; initial scope excludes guest uploads. |

Pipeline: bounded parsing → validation/honeypot → abuse guard → atomic inquiry/deduplication/outbox write → acknowledgment. Workers send immutable notification payloads; verified webhooks record delivery observations. Staff workflow and delivery status are independent.

The durable version will explicitly acknowledge **recorded for staff follow-up**, for example with `202 { ok: true }`. Change the form and API tests together; do not imply inbox delivery. Failed transactions never return success. Initially support clients without keys, clearly documenting their lack of cross-request deduplication. Define key retention and legacy behavior before activation. Honeypot discard remains a deliberate exception to normal acknowledgment.

Server authorization and database policies protect private data. Admin/inquiry responses use no-store caching; private fields never enter public caches, metadata or analytics. Authenticate writes, validate input and protect cookie-based mutations against cross-origin/CSRF requests. Public identifiers are not access credentials. Bound notes, search, pagination, job batches and exports.

## Ordered slices

B01 complete; B02a/b locally verified, B02c integration remains; B03a/b locally verified (contact records to storage, 202; worker scheduled in `vercel.json`); B04 locally verified (signed Resend webhooks, delivery event log, lost-response reconciliation); B05 locally verified (shared Postgres rate limits, Vercel client header, fail-closed 429/503); B06 locally verified (invited staff sign-in, membership table, revocation on next request); B07 locally verified (staff inbox: filters, pages, versioned statuses, notes, audit); B08 locally verified (event inquiries: package snapshot, one inbox); B09 locally verified (content publishing: versioned drafts, staff preview, publish/rollback, concurrent-edit detection; any signed-in staff edits and publishes menus, hours, packages; phone, OpenTable and lunch rules stay fixed); B10 next (gallery images, alt text and captions); B10–B12 queued. Real intake through Supabase gateway unchecked (B02c). Keep intermediate work inactive until its dependencies and checks pass.

| Slice | Depends on | Deliverable |
| --- | --- | --- |
| B01 | Existing contact | Inquiry contract and validation boundary |
| B02 | B01, provider decision | Local schema, migrations, repository and data permissions |
| B03 | B02, scheduler choice | Durable intake and recoverable notification worker |
| B04 | B03 | Signed delivery webhooks and reconciliation |
| B05 | B03, host details | Shared abuse controls and workload limits |
| B06 | B02, operator decision | Staff authentication and authorization |
| B07 | B03–B06 | Staff inbox and audited workflow |
| B08 | B07 | Private-event management |
| B09 | B06, editor scope | Restaurant content draft/publish workflow |
| B10 | B09 | Gallery media and provenance |
| B11 | B04–B10, retention decision | Monitoring, retention, CI, backup/recovery |
| B12 | B11, release authorization | Staging acceptance and production release |

### B01 — Inquiry contract: complete

Research `src/lib/server/contact.ts`, its route/form callers, `tests/contact.test.mjs`, and the installed Route Handler guide. Establish current normalization, statuses and retry behavior before editing.

Define the normalized inquiry type and isolate parsing/validation from delivery only as needed for persistence reuse. Preserve existing request limits, statuses, optional fields, honeypot and Resend behavior. No new runtime dependency, provider setup or speculative adapters. Document future persistence acknowledgment separately from implemented behavior in `docs/backend.md`.

Acceptance: current behavior tests pass; invalid/oversized input cannot reach delivery; honeypot input is discarded; callers compile. Reuse behavioral tests and add only missing risk coverage. Run test/lint/build and review the scoped diff. Recovery: reverse the scoped extraction without altering unrelated edits. Update `next.md` to B02 and flag its provider decision. This bounded slice is the first coding task after context reset.

### B02 — Persistence foundation

Confirm provider/host before provider-specific setup. Add server-only configuration, migrations, synthetic seeds and a focused repository. Set grants/policies with schema creation. Implement inquiry/key/job insertion in one database transaction, not three independent HTTP inserts. Proposed paths: `src/lib/server/inquiries/`, provider migration/test directories, `.env.example` and `docs/backend.md`.

Acceptance: migrations apply to an empty disposable local DB; data survives reconnect; constraints reject invalid states; concurrent same-key requests produce one inquiry/job; changed payload conflicts; rollback leaves no partial rows. Test anonymous/non-staff/staff permissions. Mocks cannot prove DB concurrency or policies. Record missing local tooling as a blocker, not a passed check. Never reset a remote database. Keep public intake unchanged until B03.

### B03 — Durable intake and worker

Switch route and form acknowledgment together after persistence and worker checks. Acknowledge only committed inquiry/outbox records. Persist stable job identity and immutable sender/recipient/body. Use an authenticated scheduled endpoint, bounded batches, atomic leases, finite attempts and retry delays; recover expired claims. Do not rely on unawaited work after an HTTP response.

Acceptance: a send failure retains the inquiry; DB failure is not acknowledged; workers cannot claim the same active job; crashes recover pending work; provider rejection, rate limit, timeout and lost response reach explicit states. Retry ambiguous sends only within the verified protection window, then reconcile instead of blindly resending. Guest success and notification failure remain separate. Live email needs explicit authorization and a named recipient. Recovery: pause worker, preserve backlog; avoid reverting to direct sends that duplicate stored jobs.

### B04 — Delivery webhooks

Add a bounded raw-body endpoint with maintained signature verification. Deduplicate event IDs and tolerate duplicates, delays and out-of-order delivery without regressing state. Unmatched message IDs enter a bounded reconciliation path; never attach them to arbitrary inquiries. Proposed route: `src/app/api/webhooks/resend/route.ts`.

Acceptance: altered/expired signatures and oversized bodies fail; duplicate events have one effect; delayed events reconcile; acceptance is not labeled final delivery. Test signed local fixtures. Recovery: stop processing, retain verified pending events and replay safely after repair.

### B05 — Abuse controls

Use a shared limiter supported by the actual host, not per-process memory. Apply cheap bounds before expensive work; limit attempts and accepted submissions across instances. Trust only documented host forwarding headers. Minimize stored identifiers, expire abuse records, and keep the honeypot. Add challenges only if observed abuse warrants them.

Acceptance: instances share limits; forged client headers do not evade them; safe `429`/retry guidance; explicit limiter-outage policy with phone fallback/alerts; legitimate same-key retries do not duplicate jobs. Document adjustable thresholds rather than call arbitrary values optimal. Enable before public production intake. Recovery: switch to a documented conservative policy, not unrestricted acceptance.

### B06 — Staff access

Build invited login, renewal/logout, protected admin pages and server permission checks. Start with owner/staff roles; add editor only if needed. Enforce revoked membership on subsequent operations. Follow current provider guidance for cookies, redirects, auth limits and owner account protection. Never authorize using client-editable metadata or hidden UI. Proposed areas: `src/app/admin/`, `src/lib/server/auth/` and auth integration.

Acceptance: anonymous/expired/non-staff/revoked users cannot access guest data or mutate it; staff cannot change roles; direct requests enforce UI permissions; cross-user and cross-origin tests pass. Invitations require authorization before messages are sent. Recovery: disable admin entry and revoke affected sessions without removing data.

### B07 — Staff inbox

Provide accessible, private pagination, filters, inquiry detail and bounded notes. Statuses: new → in progress → resolved, with explicit reopening. Audit status/role/publication changes without copying guest messages into audit logs. Use version checks for simultaneous edits. Index/search proportionately to volume.

Acceptance: staff can find/update synthetic inquiries; stale edits do not silently overwrite; delivery issues remain distinguishable; private content stays out of caches/logs. Browser-check keyboard and responsive use. Initially replies use staff's existing email/phone process; automatic outbound replies need a separate recipient confirmation and retry design. Recovery: disable mutations while preserving read access for authorized staff.

### B08 — Event inquiries

Reuse storage, inbox and permissions. Add optional event/package/date/guest fields only where required by the existing site. Preserve requested package context even if published packages change. Staff triage and record follow-up; no automatic confirmation. Touch form/event content, inquiry schema and inbox only as needed.

Acceptance: normal contact still works; dates remain correct; package context is retained; invalid options and unauthorized writes fail; both kinds work in one inbox. Keep booking and Call links. Recovery: hide added fields while retaining stored details.

### B09 — Content publishing

Confirm editor scope; seed from `src/lib/data/`. Add validated drafts, preview, atomic publication and revision history for menus/hours/event packages/selected settings. Public reads expose only allowed published fields. Revalidate affected routes using installed Next docs. Avoid arbitrary HTML editing or a generic CMS. Decide last-known-published/static fallback before replacing static reads.

Acceptance: drafts stay private; invalid prices/links/schedules cannot publish; concurrent edits are detected; publication reaches pages and metadata; prior revisions can be republished. Verify lunch and booking/phone invariants. Relevant areas: admin editor, `src/lib/server/content/`, existing data consumers and migrations. Recovery: republish a known revision or restore the documented read path.

### B10 — Media management

Staff-only uploads with size bounds, verified image types/dimensions, generated safe storage keys and appropriate processing. Store alt text, visible source date and URL; strip unnecessary metadata. Separate asset upload from gallery publication. Do not add arbitrary server-side URL fetching.

Acceptance: unauthorized uploads/disguised files fail; unpublished assets are private; published images render and crop well; imported post photos meet the 2026 rule. Existing assets remain until intentionally replaced. Delete only unreferenced assets after an agreed grace period. Recovery: unpublish entry rather than remove a live referenced image.

### B11 — Operations and recovery

Add safe structured logs, correlation IDs, protected health/readiness checks and metrics for intake failure, queue age, exhausted jobs, delivery and auth problems. Owner chooses alert destinations; sending alerts requires authorization. Separate local/staging/production; previews default to synthetic data and no real notifications.

Add CI for tests/lint/build and isolated DB/permission checks; deliberately maintain locked dependencies. Verify provider backup capabilities and cost, write a runbook, and exercise restore in isolation. After owner retention approval, implement bounded resumable cleanup that excludes active jobs; document effects of backup retention. Proposed areas: workflow configuration, operational server modules and `docs/backend-operations.md` when implemented.

Acceptance: simulated DB/worker/webhook outages leave recoverable work; stale queues are detectable; isolated restore succeeds; cleanup respects active records. Record results and practical limits. Recovery: pause cleanup/worker, restore in isolation, reconcile jobs, then propose any live recovery action.

### B12 — Staging and release

Prepare staging acceptance for contact/events, retries, worker recovery, delivery states, staff access/revocation, publish/rollback, gallery, OpenTable and Call. Use synthetic guests. Verify migrations, environment separation, domain/sender, scheduler, monitoring and backups. Ask for live email and production deployment authorization when needed.

Acceptance: checks pass on intended hosting, owner can perform core staff tasks, limitations are recorded and concrete rollback/reconciliation instructions exist. Git approval is not deployment approval. Explain automatic deployment effects before requesting push. After approved launch, check flows without booking real tables or contacting guests.

## Session and Git checkpoints

Work one cohesive slice at a time; split large work into named parts such as B03a/B03b, each with acceptance criteria and activation state. A parent remains incomplete while required parts/checks remain. Create a detailed slice plan only when complexity warrants it; this roadmap stays the index.

After every verified slice/part, update progress here and replace `next.md`: completed work, relevant paths, exact checks, decisions, blockers and one next action. Update `docs/backend.md` for implemented API changes. Avoid duplicate roadmap text or transcripts in the handoff.

Say **You can clear context now** after saving/checking a stable handoff. Prefer a substantial slice per session; keep useful context until a natural boundary. If stopping with failed checks or unfinished activation, record it explicitly and do not call the feature complete. The [existing token benchmark](../token-benchmark.md) did not establish savings; concise snapshots/scoped reads are choices to measure, not a promised percentage reduction.

Before Git operations, prepare file groups, proposed commits, reviewed diff including untracked files, check results, branch/remote and any deployment effect. Review secrets, environment files, photo provenance/licensing and benchmark artifacts. Do not blindly stage all files or assume unrelated edits are yours.

**First Git checkpoint: after B01 verification**, propose a reviewed baseline for the accumulated website/Codex/backend work and planning docs. Later checkpoints follow verified features. Ask whether to commit, push or both. Approval can cover a stated batch; do not ask repeatedly within that scope. Nothing is authorized yet. Do not push to main, rewrite history, force-push or deploy from this planning request. Propose a branch/PR in the concrete review. If approval is deferred, keep verified local work and record that state; do not block unrelated authorized implementation solely on a missing commit.

## Verification and progress

Application slices require `npm.cmd test`, `npm.cmd run lint`, `npm.cmd run build`, plus real isolated DB or browser checks when relevant. Mocks do not prove DB transactions/RLS, actual delivery or deployment. Documentation-only edits need local link checks and diff review rather than application rebuilds.

| Item | Status | Evidence / next action |
| --- | --- | --- |
| Contact foundation | Implemented locally | Prior 41 mock tests, lint/build passed; live mail unverified. |
| Research/roadmap | Complete | Repository inventory and official sources, 2026-10-08. |
| Handoff/process wiring | Complete | `next.md`; root instructions and workflow reference it. |
| B01 | Complete, 2026-10-09 | `src/lib/server/inquiries/contact-input.ts`, delivery handler and contact tests. All 43 tests, lint and build passed; delivery code unchanged. Sandbox test-worker failure resolved by approved escalation; existing build lockfile warning remains. No live mail/DB verification. |
| B02a/b | Implemented and locally verified, 2026-10-09 | [Selected stack](backend-provider-decision.md), [B02 results](b02-persistence.md), migration/seeds, server-only caller and native PostgreSQL tests. 48 app tests, eight DB cases plus parent, lint/build passed. Sandbox worker failures resolved by escalation. Public route unchanged; staff access closed until B06. |
| B02c | Blocked: BIOS virtualization off, 2026-10-09 | Docker Desktop needs hardware virtualization (firmware reports disabled; WSL absent). Owner must enable it in BIOS. Full Supabase gateway/Auth/migration workflow requires compatible local container tooling or authorized isolated staging. Standalone PostgreSQL proves SQL properties only. No remote reset/live migration. |
| Dependency readiness | Runtime clean, 2026-10-09 | Next/eslint-config-next 16.3.5 -> 16.4.0 (fixes critical next/og RCE plus cache/SSRF advisories); `npm audit --omit=dev` 0. Five high remain in dev-only ESLint glob chain (braces/micromatch/fast-glob), no upstream fix; recheck before release. 48 tests, 9 DB, lint, build, production smoke of all routes and /opengraph-image passed. |
| B06 | Implemented and locally verified, 2026-10-10 | Migration `202610100001_staff_access.sql`, `src/lib/server/auth/`, `src/app/admin/`, `tests/staff-auth.test.mjs`, DB staff cases. 65 tests, 15 DB, lint, build, headless-Chrome flow against a loopback fake Supabase passed. Real Supabase Auth and invite email unchecked (B02c / owner authorization). |
| B07–B10 | Implemented and locally verified, 2026-10-10 | Inbox, event inquiries, content publishing, gallery photos (stored in PostgreSQL as WebP); see `next.md` for paths and checks. Real Supabase gateway unchecked (B02c). |
| B11a | Implemented and locally verified, 2026-10-10 | Migration `202610100006_ops_snapshot.sql`, `src/lib/server/ops.ts`, `GET /api/health`, JSON logs with request ID, `.github/workflows/ci.yml`, [docs/backend-operations.md](../backend-operations.md). 82 tests, 20 DB, lint, build; health checked over HTTP against real PostgreSQL (public, wrong secret, ok, database down: 503). CI unrun on GitHub. |
| B11b | Implemented and locally verified, 2026-10-10 | Migration `202610100007_retention.sql` (`run_retention`), `/api/cron/retention` (daily, needs `RETENTION_ENABLED=1`), runbook, retention table, environments in [docs/backend-operations.md](../backend-operations.md). Owner approved 24 months after resolution / 90 days technical logs, uptime-monitor alerts. 82 tests, 21 DB, lint, build; retention route checked over HTTP. Local cold-copy restore drill passed; real Supabase restore and monitor setup unchecked (B12). |
| B12 | Plan written, 2026-10-10; execution blocked on owner | [Release checklist](../release-checklist.md): staging acceptance, release steps, rollback. Needs accounts, paid services, push and live-email authorization; B02c happens on the staging project. Nothing run yet. |
| Baseline commit/push | Local commit authorized, 2026-10-09; push not authorized | Branch `codex/backend-foundation`; [approved baseline scope](baseline-git-review.md). Verify commit execution with Git; raw benchmark logs excluded. |

When completing a part, record date, paths, exact check outcomes, limitations and next dependency here. Replace stale status instead of accumulating a transcript.
