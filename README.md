# Château Capitaine

Marketing website for Château Capitaine, a bar and grill on Coney Island Avenue in Brooklyn.

Next.js 16 (App Router), TypeScript, and Tailwind CSS v4. There is no CMS or database. Content lives in typed data files. Public pages are pre-rendered at build time; contact submissions use a server-side API route.

## Getting started

```bash
npm ci
npm run dev                  # http://localhost:3000
```

To test the contact form, copy `.env.example` to `.env.local` and supply the server-side settings described below. In PowerShell, use `Copy-Item .env.example .env.local`. Node.js 20.9 or newer is required by the installed Next.js version. If PowerShell blocks npm's script wrapper, use `npm.cmd` and `npx.cmd`.

Before calling an application change done, run both of these. Each must pass with no errors. Documentation-only checks and browser verification are described in [validation.md](docs/validation.md).

```bash
npm run build
npm run lint
```

## Pages

| Route | File |
|---|---|
| `/` | `src/app/page.tsx` |
| `/menu` | `src/app/menu/page.tsx` |
| `/private-events` | `src/app/private-events/page.tsx` |
| `/gallery` | `src/app/gallery/page.tsx` |
| `/about` | `src/app/about/page.tsx` |
| `/contact` | `src/app/contact/page.tsx` |
| `/testimonials` | `src/app/testimonials/page.tsx` |
| 404 | `src/app/not-found.tsx` |

## Editing content

| What | Where |
|---|---|
| Name, address, phone, email, hours, social links, domain | `src/lib/data/site.ts` |
| Menu and the lunch special | `src/lib/data/menu.ts` |
| Banquet packages | `src/lib/data/private-events.ts` |
| Guest reviews | `src/lib/data/testimonials.ts` |
| Gallery photos | `src/lib/data/gallery.ts` |

`site.ts` is the single source for business details. The header, footer, contact page, structured data, and sitemap all read from it, so change a phone number or hours there and nowhere else.

## Adding photos

Put image files in `public/photos/`.

- **Gallery:** set `src` on the matching entry in `gallery.ts` (for example `"/photos/bar.jpg"`). The entry's `alt` text is already written. Until any gallery photo has a `src`, the gallery page stays out of search results and out of the sitemap. Both switch on automatically once one does.
- **Other slots** (home, about, private events): each `PlaceholderImage` has a `label` describing the shot it needs. Pass a real photo path through its `src` prop to render the photo at the same aspect ratio without changing the layout.

## Contact form

The form (`src/components/contact/contact-form.tsx`) posts to `src/app/api/contact/route.ts`. The route uses `src/lib/server/contact.ts` to validate each submission and store it in Supabase with a notification job. A Vercel Cron job (`vercel.json`, every minute) calls `/api/cron/notifications`, which emails staff through [Resend](https://resend.com) with `fetch` (no SDK). See [supabase/README.md](supabase/README.md).

| Variable | Purpose |
|---|---|
| `RESEND_API_KEY` | Resend API key. Server-only. |
| `CONTACT_FROM_EMAIL` | The sender address. Until the domain is verified in Resend, use its test sender, `Château Capitaine <onboarding@resend.dev>`. |
| `CONTACT_TO_EMAIL` | Optional. The recipient, which defaults to `site.email`. The test sender only delivers to the Resend account owner's own address, so set this to that address while testing. |
| `SUPABASE_URL`, `SUPABASE_SECRET_KEY` | Inquiry storage. Server-only. |
| `CRON_SECRET` | Authenticates the scheduled worker. Random, 16+ characters. |

If storage or sender settings aren't set, the form shows a message asking the guest to call instead. Without `CRON_SECRET`/`RESEND_API_KEY`, inquiries are stored but no email goes out until they are set.

The endpoint requires JSON, limits submissions to 32 KiB, validates real calendar dates and positive guest counts (1–9999), and quietly discards honeypot submissions. Optional fields can be omitted or blank. Dates are inquiry details; submitting the form does not reserve a table or event.

Email requests time out after 10 seconds and report success only after the provider returns an email ID. That confirms provider acceptance, not delivery to the recipient's inbox. A timeout can leave delivery uncertain, so there are no automatic retries; guests can call before resending. Logs contain only diagnostic codes and provider status, never submission contents or raw provider responses.

Run `npm test` for the contact backend's mocked tests. They cover validation, request limits, provider failures/timeouts, and route configuration without sending email. The suite uses Node's built-in runner and the already-installed TypeScript compiler; the production build verifies types. Durable inquiry storage, reservation availability, and distributed abuse controls require a separate deployment/data plan.

## Before launch

- Set `site.url` in `src/lib/data/site.ts` to the production domain. Canonical URLs, the sitemap, `robots.txt`, share images, and structured data all derive from it.
- Old WordPress URLs redirect to their new pages through `next.config.ts`. This only has an effect if the old domain points at this site.
- Once the domain is verified in Resend, switch `CONTACT_FROM_EMAIL` to an address on that domain.

## Other files

- `src/components/ui/logo-mark.tsx` is the logo: a captain's cap on an anchor with a loose rope. It's an inline SVG that takes its color from the surrounding text color. The header, the footer, and the share image use it.
- `src/app/icon.svg` is a bolder cut of the logo, without the rope, for the browser tab. `src/app/apple-icon.tsx` generates the iOS home-screen icon from that file.
- `assets/fonts/` holds the TTF files the share image (`src/app/opengraph-image.tsx`) renders with. Both fonts are under the SIL Open Font License, and a copy of each license sits in the same folder.

## Working with ChatGPT Codex

Open this repository in Codex. [AGENTS.md](AGENTS.md) supplies the project instructions automatically: **Research → Plan → Build → Verify** for every task, with depth proportional to the work. Ask for a concrete outcome and acceptance criteria; Codex researches local patterns first, plans before editing, implements complete changes, and runs the relevant checks.

- [Workflow and task briefs](docs/codex-workflow.md)
- [Design rules](docs/design.md) and [technical conventions](docs/technical.md)
- [Verification](docs/validation.md) and [execution-plan format](PLANS.md)
- [Backend roadmap](docs/plans/backend-roadmap.md) and [next session instructions](next.md)
- [Research, benchmarks, and measurement protocol](docs/research.md)

Project skills in `.agents/skills/` cover new pages, session handoffs, screenshot recreation, site visual design, and brand assets. Codex loads the relevant skill when needed; there is no mandatory chain of researcher/reviewer agents. Existing website changes must be preserved.

To resume backend work after clearing context, ask Codex: **Read next.md and follow its starting task.** Codex updates it after each completed feature or slice, reports when context can be cleared, and requests commit/push authorization at a reviewed checkpoint. Planning is not permission to push or deploy.

The existing Playwright browser MCP server is configured in `.codex/config.toml`. Codex loads project configuration only for trusted projects. Restart the client if the server does not appear; first startup may require network access or browser setup. Model, reasoning effort, permissions, and credentials remain in personal settings. This migration does not change installed tools outside the repository.

Keep the Next.js-managed block in `AGENTS.md`: the installed framework uses it to direct agents to version-matched local documentation. Detailed rules live in linked documents so every task does not load the whole documentation collection.
