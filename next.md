# Next backend session

Updated: 2026-10-09. Canonical rolling handoff; replace stale state after every completed feature or slice.

## Objective and starting task

Follow [the backend roadmap](docs/plans/backend-roadmap.md), always **Research → Plan → Build → Verify**. **B01 is complete. Start B02: persistence foundation.**

1. Check `git status --short`; preserve the accumulated uncommitted work. Read `AGENTS.md`, [the implemented contract](docs/backend.md) and the roadmap's B02 section. Do not repeat B01.
2. Check whether the owner answered the provider question: proposed Supabase PostgreSQL/Auth, with website hosting undecided. No decision has been received as of this snapshot. Confirm provider/host/account ownership/budget/region before provider-specific setup; use any later answer instead of asking again.
3. While the decision is pending, inspect existing local database tooling and plan the inquiry/key/outbox transaction and access tests. Do not provision services, apply live migrations or silently substitute in-memory storage.
4. After the provider decision, implement migrations, synthetic seeds, server-only configuration and a focused transactional repository. Use the valid inquiry contract in `src/lib/server/inquiries/contact-input.ts`. Keep public intake on existing direct email behavior until B03's worker and durable acknowledgment are ready.
5. Verify migrations and concurrency/rollback/access against a disposable local database, plus `npm.cmd test`, `npm.cmd run lint`, `npm.cmd run build`. Mock tests cannot prove DB properties. Record missing tooling as a blocker, not a pass.
6. Update roadmap progress and this file after each verified part. Tell the user when the saved handoff is ready for clearing context.

## Completed and verified

- B01 isolated parsing/validation and introduced `NormalizedInquiry` (six bounded normalized strings). Valid/discard/invalid results prevent honeypot or invalid input from reaching future storage. The handler's configuration and email-delivery code remain unchanged.
- Changed paths: `src/lib/server/inquiries/contact-input.ts`, `src/lib/server/contact.ts`, `tests/contact.test.mjs`, `docs/backend.md`, roadmap and this handoff.
- 2026-10-09: **43/43 mocked tests, lint and production build passed**. Initial sandbox test-worker `spawn EPERM` resolved by approved escalation. Build retains the existing parent-directory lockfile warning. No UI changes or live mail; no DB exists yet.
- Next 16.3.5 / React 19.2.8 / npm. Read installed Next.js guides before framework code.

## Constraints and Git checkpoint

- Keep OpenTable Book now and all Call buttons. Inquiries do not confirm bookings. Lunch is three courses, beverages excluded.
- New downloaded photos: **2026 posts only**; [provenance](docs/photo-sources.md). Existing older assets remain; venue/chef placeholders remain.
- Form retries share a UUID only while the form stays mounted; Resend deduplication is limited to 24 hours.
- Branch `codex/backend-foundation`; origin `https://github.com/sosnovskiyanthony/chateau-capitane`. The owner authorized the reviewed local baseline commit on 2026-10-09. Check `git log -1 --oneline` and current status to verify execution before resuming.
- [Git baseline scope](docs/plans/baseline-git-review.md): accumulated frontend/photo/Codex/backend work and B01 checks; this handoff and authorization record are included. Raw benchmark traces remain local pending publication review. **Push is not authorized.** Do not ask again for the approved local baseline commit. No deployment, live migration, invitation or real test email is authorized.
- Owner/staff decisions are needed before B06; retention before B11. Continue independent local work while decisions are pending.

## Reset protocol

Update this file and the roadmap after every completed feature/part; keep failures and inactive work explicit. `HANDOFF.md` is only a pointer. At a stable checkpoint say the context can be cleared.

Fresh-session prompt: **Read next.md and follow its starting task.**
