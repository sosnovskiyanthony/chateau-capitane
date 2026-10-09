# Contact backend foundation

## Outcome

Improve the existing `/api/contact` inquiry flow while retaining the current form payload and `{ ok: true }`/`{ error: string }` response contract. No database or real email delivery is required for this increment.

## Research

The current route validates required text and length but accepts nonexistent dates, zero guests, and wrong types on optional fields by silently dropping them. It reads an unbounded JSON body, waits indefinitely for email delivery, and logs raw provider error bodies. The form already displays invalid-input and delivery-failure states. Installed Next.js route-handler guidance supports native Request/Response. [Resend's sending API](https://resend.com/docs/api-reference/emails/send-email) accepts plain-text messages and returns an email ID on successful submission; that is provider acceptance, not confirmed inbox delivery.

## Scope and steps

1. Extract a server-side contact handler with injected configuration, fetch, and diagnostics for deterministic tests.
2. Validate JSON content type, a bounded 32 KiB UTF-8 body, field types/lengths, actual calendar dates, and positive guest counts. Preserve the honeypot and optional fields.
3. Bound provider response time, verify successful provider acknowledgment, and expose safe failure messages. Read environment settings at request time and keep configured recipients server-controlled.
4. Add Node's built-in tests using the already-installed TypeScript compiler, with mocked email requests; add `npm test` and document runtime behavior.
5. Run tests, lint, build, and scoped diff checks. Do not send live email or change unrelated website edits.

## Acceptance and limits

Malformed/oversized/non-JSON requests must not send email. Valid requests send one correctly addressed message. Honeypot submissions return success without delivery. Missing configuration, provider rejection, malformed acknowledgments, network failure, and timeout produce controlled failures without sensitive logs. This increment does not claim durable inquiry storage, distributed rate limiting, reservation availability, confirmed delivery, or safe automatic retries after an ambiguous timeout.

## Progress

Completed the initial contact/inquiry backend slice. All 35 mocked tests passed, including route configuration and timeout handling; ESLint and the production build passed. The sandbox initially blocked isolated test/TypeScript worker processes, and both checks passed after approved escalation. Build retained the pre-existing parent-directory lockfile warning. No UI files were changed, no live email was sent, and no inbox-delivery or reservation behavior is claimed. Contract and next product decisions are documented in [backend.md](../backend.md).
