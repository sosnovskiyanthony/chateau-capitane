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

Keyless requests create separate units. Keys have no expiry/reuse mechanism yet; B03 must document a retention policy before activation. Dates remain validated `YYYY-MM-DD` strings, including ISO year 0000 accepted by the current parser; no timezone conversion occurs. Timestamps use `timestamptz`. No inquiry/key/job is committed when a write fails. A lost HTTP acknowledgment may follow a commit, so the caller returns `unavailable`; retry using the original key to resolve uncertainty. Keyless callers cannot resolve this safely through deduplication.

The database job states/attempt fields are a foundation, not a worker implementation. Lease fields, reconciliation and update permissions belong in B03. No staff membership/invitations or retention cleanup are implemented. [Provider decision](../docs/plans/backend-provider-decision.md), [B02 progress](../docs/plans/b02-persistence.md).
