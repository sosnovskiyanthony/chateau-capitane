# Production provider decision

Selected 2026-10-09 after the owner delegated provider selection and local implementation. This authorizes development against the selected stack; no paid account, deployment, live migration or email has been created.

## Choice and evidence

| Area | Selection | Reason |
| --- | --- | --- |
| Website | Vercel Pro | Native Next.js deployment, previews and managed functions; Pro supports minute-level scheduled worker invocation. |
| Database / staff authentication | Supabase Pro PostgreSQL / Auth | One managed system for relational transactions, invited staff identity and future media storage. Pro avoids inactivity pauses and includes seven days of daily database backups. |
| Region | Supabase specific `us-east-1`, Vercel `iad1` | Co-locate server execution and data near the Brooklyn business. Public static assets use the CDN. This is a latency choice, not a legal residency assessment. |
| Ownership | Company-controlled organizations and billing | Company owner holds primary access and recovery; developers receive separate access. No accounts have been provisioned. |
| Planning budget | Approximately USD 45/month base | Vercel Pro starts at $20 for one developer seat; Supabase Pro starts at $25 for one project. Domain, email, additional projects/seats, taxes and usage are extra. This is an estimate, not approval to spend. |
| Local verification | Disposable native PostgreSQL 17 | A pinned development-only embedded-postgres package supplies actual Windows PostgreSQL binaries without installing a system service or Docker. It does not emulate Supabase Auth or its API gateway. |

Sources checked online: [Vercel pricing](https://vercel.com/pricing), [cron limits](https://vercel.com/docs/cron-jobs/usage-and-pricing), [function regions](https://vercel.com/docs/functions/configuring-functions/region), [Supabase pricing](https://supabase.com/pricing), [production checklist](https://supabase.com/docs/guides/deployment/going-into-prod), [regions](https://supabase.com/docs/guides/platform/regions), [backups](https://supabase.com/docs/guides/platform/backups), [embedded-postgres](https://github.com/leinelissen/embedded-postgres).

## Alternatives and tradeoffs

[Netlify Pro](https://www.netlify.com/pricing/) supports Next.js and has unlimited team seats at its $20 starting tier. Its credit model can pause sites when credits run out unless recharging is enabled. Vercel is selected for direct alignment with this Next.js application, not because Netlify is incapable. [Neon](https://neon.com/blog/new-usage-based-pricing) offers usage-based PostgreSQL and newer backend/Auth primitives; Supabase is selected for the documented integrated Auth, storage and database access model already anticipated by this roadmap. A self-managed server adds patching, availability and backup responsibilities that are disproportionate to this site's initial needs.

These are engineering judgments for this project, not a universal provider ranking. Pro plans are production starting points, not enterprise SLA guarantees. Daily backups can lose changes since the last backup; PITR costs extra and restore rehearsal remains B11 work. Enable billing alerts and review limits before release; do not silently trade availability for a hard spending cutoff.

## Build plan and acceptance

1. B02a: migration with private inquiry/key/job tables, constraints, grants and deny-by-default RLS; one volatile invoker RPC performs atomic intake. Database computes a versioned fingerprint from fixed fields and immutable notification settings. Staff access stays closed until B06.
2. B02b: server-only configuration and a bounded RPC caller. No connection pool/ORM is needed for one PostgREST transaction. [PostgREST](https://docs.postgrest.org/en/stable/references/transactions.html) wraps each request in a transaction. Keep the contact route inactive for persistence until B03.
3. Use synthetic seeds and disposable local PostgreSQL tests for migration rebuild, reconnect, concurrent retries/conflicts, constraint failure rollback and role denial. Add caller tests for configuration, safe failures and lost-response handling. Run application tests, lint and build.
4. Record the limits: standalone PostgreSQL proves SQL behavior and role boundaries; full Supabase gateway/Auth integration requires the local Supabase stack or isolated staging before activation. Do not claim those tests passed without running them.

Affected paths: `supabase/migrations/`, `supabase/seed.sql`, `src/lib/server/inquiries/`, `tests/`, `package.json`/lockfile, `.env.example`, `.gitignore`, backend docs and handoff. Preserve unrelated benchmark traces. Recovery before B03: remove the inactive modules/config; no public intake migration or live database rollback is involved.
