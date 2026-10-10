# Backend foundation

The initial backend capability is contact and event inquiries through the existing form. There is no database, admin login, reservation inventory, payment flow, or persistent inquiry queue in this increment.

## Contact request

`POST /api/contact`, `Content-Type: application/json`. Required strings: `name` (1–200 characters after normalization), `email` (valid address up to 254), and `message` (1–5000 after trimming). Optional strings: `phone` (up to 40, one line), `date` (valid `YYYY-MM-DD` calendar date), `guests` (integer string 1–9999), and `company` (honeypot, normally empty). The actual UTF-8 request body cannot exceed 32 KiB, regardless of Content-Length. Recipient selection is server-controlled.

The Next.js route reads environment settings per request and invokes the testable server handler in `src/lib/server/contact.ts`. The handler delegates bounded parsing and validation to `src/lib/server/inquiries/contact-input.ts`, then sends one plain-text email through [Resend's sending API](https://resend.com/docs/api-reference/emails/send-email), using the guest email for replies. Settings and setup are documented in [README.md](../README.md).

| Status | Meaning |
| --- | --- |
| 200 | Provider accepted the email, or honeypot submission was quietly discarded. |
| 400 | Malformed JSON, invalid field type, or invalid field value. |
| 413 | Request body exceeds the limit. |
| 415 | Request isn't JSON. |
| 503 | Required server configuration is absent. |
| 502 | Provider rejection, network failure, or invalid acknowledgment. |
| 504 | Provider timeout. Delivery can be uncertain; call before resending. |

Successful replies contain `{ "ok": true }`; errors contain `{ "error": "..." }`. Responses are not cached. The existing form retains its generic validation/failure UI and phone fallback. Provider diagnostics never appear in public responses, and logs contain only static codes and status numbers.

## Contact retry protection

### Internal normalized inquiry contract

`parseContactInput(request)` reads the body once and returns a discriminated result: `valid` with a `NormalizedInquiry` and separate submission key; `discard` for a honeypot; or `invalid` with a safe error and 400/413/415 status. Only a valid result contains inquiry data. Parsing neither reads delivery configuration nor calls a provider.

The readonly TypeScript inquiry type contains exactly `name`, `email`, `phone`, `date`, `guests`, and `message`, all strings. Text is trimmed, name whitespace is collapsed, and optional blanks/omissions normalize to empty strings. Guest count remains a validated integer string and date remains a calendar-date string for compatibility. Unknown guest-supplied fields, recipients, workflow state and the honeypot never enter the normalized object. Readonly is a compile-time contract, not a runtime freeze.

This boundary is ready for future storage reuse; it does not persist anything. A proposed durable version will atomically write inquiry/key/notification job and acknowledge recorded-for-follow-up with 202. That response, transaction and worker are **not implemented**; current success remains 200 after provider acceptance or honeypot discard.

### Provider retry behavior

The form generates a UUID v4 submission key and sends it in `Idempotency-Key`. An unchanged retry in the same mounted form reuses the key; changing fields or completing a successful submission creates a new submission. A synchronous guard prevents overlapping submits before React updates the button state.

The server validates supplied keys and forwards them to Resend with a `contact/` prefix. Invalid keys return 400 before delivery. Older clients may omit the header, but do not receive duplicate protection. [Resend retains keys for 24 hours](https://resend.com/docs/dashboard/emails/idempotency-keys); this protection does not survive page reloads or prevent spam. There are no automatic retries. Modified submissions and changes to server sender/recipient settings are distinct requests; provider key conflicts return the existing safe failure response.

Mock tests simulate a provider accepting an email while its response is lost, then receiving a retry with the same key. They verify one simulated delivery, malformed-key rejection, and compatibility with callers that omit the header. Live provider delivery remains untested.

## Verification and next decisions

### Inactive persistence foundation

B02a/b implemented locally on 2026-10-09: [Supabase migration and local test instructions](../supabase/README.md), private inquiry/key/job tables, atomic retry-aware intake RPC, synthetic seeds and `src/lib/server/inquiries/persistence.ts`. The module is server-only and is not called by the contact route. Public request/response and direct email behavior above remain unchanged.

The database computes a versioned fingerprint, claims keys uniquely and writes an inquiry with its immutable notification snapshot in the same transaction. Matching retries return an internal recorded result; changed input/configuration conflicts. Keyless requests lack deduplication. Private grants and RLS deny anonymous and authenticated access, including claimed staff; trusted staff membership is deferred to B06. Keys remain reserved without cleanup until B03 establishes policy.

Verified: 48 application tests, real PostgreSQL suite (eight behavior cases plus its parent test), lint and production build passed. SQL checks use independent connections and include reconnect, concurrent retries/conflicts, rollback, constraints, payload immutability and role/RLS denial. This proves local PostgreSQL properties, not full Supabase API/Auth integration. B02c gateway/Auth checks remain unrun. Initial sandbox test/build worker `spawn EPERM` resolved with approved escalation; the existing parent lockfile build warning remains. Installation audit reported nine existing dependency advisories (eight high, one critical, including Next.js); existing locked package versions were unchanged. Address these before production release in a separate dependency slice.

Production stack selected under delegated authority: Vercel Pro, Supabase Pro PostgreSQL/Auth, Northern Virginia, company-owned accounts. [Research, alternatives, budget and scope](plans/backend-provider-decision.md). No paid service, deployment, live migration or mail has occurred.

The complete implementation sequence is in [the backend roadmap](plans/backend-roadmap.md); [next.md](../next.md) names the next slice. This document describes implemented behavior, not planned capabilities.

`npm test` uses mocked delivery for validation, body limits, honeypot, environment wiring, successful send, provider failures, and timeout. `npm run lint` and `npm run build` remain required for application changes. No live delivery is claimed from mock tests.

B01 verified 2026-10-09: all 43 tests, ESLint and production build passed. Added checks ensure normalized fields exclude routing/workflow input and discarded/invalid results expose no inquiry. Existing invalid-body tests also prove delivery configuration is not reached. The sandbox initially blocked the test worker with `spawn EPERM`; the same test command passed after approved escalation. The build retained the existing parent-directory lockfile warning. No frontend changes or live emails in this slice.

Before provider setup, decide the hosting/database environment; staff access and retention decisions are needed before their respective slices. Durable storage, an outbox, distributed abuse controls and authentication follow the roadmap. OpenTable remains responsible for table reservations; local contact/event inquiries request staff follow-up rather than reserve inventory.
