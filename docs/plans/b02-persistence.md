# B02 persistence preparation

Updated: 2026-10-09. B02a/b implemented and locally verified; full Supabase integration remains B02c.

## Outcome and scope

Persist one validated inquiry, its optional submission key, and one immutable notification job atomically. Keep the public contact route and direct Resend behavior unchanged until B03. Implementation will affect `src/lib/server/inquiries/`, the selected provider's migrations/seeds, focused database tests, `.env.example`, and `docs/backend.md`.

## Research and blockers

- B01 is committed in `dbd290f` on `codex/backend-foundation`. Its `NormalizedInquiry` contains six bounded strings; only `valid` parsing results expose inquiry data. Keys are optional UUID v4 strings and should be canonicalized to lowercase for storage.
- The initial inspection found no PostgreSQL, Docker or Supabase CLI tooling. This session installed pinned development-only embedded-postgres 17.10 and verified actual disposable native PostgreSQL on loopback. Full Supabase CLI/gateway/Auth tooling remains unavailable.
- The owner delegated provider selection, research and local building. [Selected stack and evidence](backend-provider-decision.md): Vercel Pro, Supabase Pro PostgreSQL/Auth, specific Northern Virginia regions, company-controlled accounts, approximately $45/month production base. Paid provisioning and deployment remain unauthorized; no credentials/accounts have been created.
- [PostgreSQL transaction isolation](https://www.postgresql.org/docs/current/transaction-iso.html) explains that concurrent `ON CONFLICT DO NOTHING` can encounter a row invisible to the insert's snapshot. Read an existing key in a subsequent statement, not a same-statement snapshot fallback.
- [Supabase local development](https://supabase.com/docs/guides/local-development) documents the CLI/container workflow; [RLS guidance](https://supabase.com/docs/guides/database/postgres/row-level-security) distinguishes grants, policies and privileged bypass. Recheck the chosen provider's current setup before implementation.

## Proposed transaction

1. Accept only validated normalized data and server-controlled delivery settings. Fingerprint a versioned, fixed-order encoding of the six fields, endpoint and notification configuration/version; do not hash arbitrary incoming JSON. Keep guest data and fingerprints out of logs.
2. Begin one database transaction. For a supplied key, attempt to claim a unique `(endpoint, canonical_key)` row with the fingerprint and generated inquiry UUID. Use a deferred inquiry foreign key if the claim precedes inquiry insertion. If another transaction wins, read the committed claim in a subsequent statement: matching fingerprint returns the existing result, changed fingerprint returns a conflict without writes.
3. For a new claim, insert the inquiry and one job with a unique `(inquiry_id, purpose)`. Snapshot the server-selected sender, recipient and body with a payload version. Missing/invalid notification configuration fails before committing anything.
4. Commit before returning the repository result. Any constraint, job insert or connection failure rolls back the entire unit. If commit acknowledgment is lost, retry with the same key to resolve uncertainty. Keyless clients create a new inquiry/job per successful call; they have no cross-request deduplication.
5. Keep key expiry informational until a documented cleanup/reuse policy is selected before B03 activation. Do not silently reuse expired keys or run retention cleanup. Do not expose inquiry identifiers or guest data through public retry responses.

The selected implementation uses one volatile invoker PostgreSQL function called through PostgREST. The database computes the fingerprint; private schema grants and RLS deny non-server access. Keys have no expiry until reuse/cleanup policy is defined. See [the implemented inactive contract](../../supabase/README.md); public intake remains direct email.

## Schema and permissions

Enforce normalized field bounds, valid date/guest values, allowed workflow/job states, foreign keys, key uniqueness and notification-purpose uniqueness in migrations. Preserve calendar-date semantics and use UTC timestamps. Use synthetic `.invalid` guest addresses; seeds never send mail.

Deny anonymous and non-staff reads/writes to private tables and transaction functions. Only the authorized server path may ingest inquiries/create jobs. Staff access must use trusted membership, not client-editable metadata; absent B06 membership, keep staff grants closed and document that dependency. If policies allow staff reads, provide a minimal server-controlled membership foundation and test it without implementing invitations/login. Staff must not change membership, keys or immutable job payloads. Privileged service-role success alone does not prove RLS protection.

## Verification plan

Use a disposable, explicitly local database with synthetic fixtures; refuse remote reset targets. Run migrations from empty state and repeat the supported rebuild workflow. Use independent real connections for concurrency tests.

| Check | Required evidence |
| --- | --- |
| Reconnect | Committed inquiry/key/job remain visible on a new connection. |
| Concurrent retry | Many identical keyed submissions yield exactly one inquiry, key and job and the same repository result. Include uppercase/lowercase UUID variants. |
| Conflict | Concurrent and sequential changed-payload requests with the same key conflict without extra rows or replacement of the original snapshot. |
| Rollback | Force a job constraint failure after inquiry insertion; all new rows disappear. A competing retry succeeds after the failed transaction releases its key claim. |
| Legacy input | Keyless calls create separate complete units; invalid/discard parser results never invoke storage. |
| Constraints | Direct invalid field/state, orphan-reference and duplicate-purpose writes fail. |
| Permissions | Exercise anonymous, authenticated non-staff, authorized staff and server roles. Denied roles cannot read guest rows or invoke ingest; staff cannot self-promote or modify keys/jobs. Test revocation if membership exists. |
| Application regression | `npm.cmd test`, `npm.cmd run lint`, `npm.cmd run build`; public route remains direct email. |

Verified 2026-10-09: `npm.cmd test` passed 48/48; `npm.cmd run test:db` passed eight behavior cases plus the parent test on native PostgreSQL 17.10; lint and production build passed. The DB suite rebuilt migrations in two empty databases, repeated synthetic seeds, checked fresh-connection persistence, concurrent retries/conflicts, rollback and a lock-blocked competitor, keyless calls, constraints, immutable payload and denial for anonymous/authenticated users. Temporary test-only grants proved RLS denial independently. Staff grants remain closed until B06; no authorized staff path is claimed. Full Supabase gateway/Auth integration is unrun. Initial sandbox `spawn EPERM` failures resolved by approved escalation; existing build lockfile warning remains. Recovery before B03 is removal of inactive code/configuration; no live migration/data deletion is authorized.

`npm audit` reported nine existing advisories including critical Next.js; none of the previously locked package versions changed. Dependency remediation is a separate production-readiness task before release.

## Next action

B02c: establish a full disposable local Supabase stack (requires compatible Docker/container tooling) or explicitly authorized isolated staging, then verify migrations and the RPC through the API gateway with server, anonymous and authenticated keys. No remote reset. Record the integration evidence before marking B02 complete or activating B03. Provider selection is resolved; no new owner decision is needed for local implementation.
