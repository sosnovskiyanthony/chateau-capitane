# Technical conventions

Next.js 16.3.5 App Router, React 19, TypeScript, Tailwind CSS v4, npm. Consult `package.json` and the lockfile for actual installed versions. Before writing Next.js code, read the relevant guide in `node_modules/next/dist/docs/` as required by `AGENTS.md`.

- Server Components by default. Add `"use client"` only for state, effects, event handlers, or browser APIs. Keep secrets and email delivery on the server.
- Each public page has specific metadata through `pageMetadata` in `src/lib/metadata.ts`. Pass a plain page title; the layout handles the site-name template. The home page can omit the title. Preserve canonical and Open Graph fields.
- Exactly one `<h1>` per page. Use semantic landmarks and meaningful sections; check the root layout before adding another `<main>`.
- Use `next/link` internally and `next/image` for photos. Provide intrinsic dimensions or a sized `fill` container with appropriate `sizes`. Reuse `PlaceholderImage` when appropriate. Inline SVG logos remain SVG.
- Use existing Tailwind v4 utilities and tokens in `globals.css`; no CDN, CSS-in-JS system, or Tailwind v3 configuration scaffold.
- Keep business facts in `src/lib/data/site.ts`, menu content in `menu.ts`, event packages in `private-events.ts`, reviews in `testimonials.ts`, and images in `gallery.ts`. Never invent prices, hours, reviews, or contact details.
- Online table reservations use `site.reservationUrl` and `BookCta`, opening OpenTable in a new tab. The URL matches the current restaurant site's header booking link (restaurant ID `1023577`), verified on 2026-10-08. OpenTable handles availability and confirmation; phone links remain for enquiries and banquets.
- `navLinks` and `footerLinks` in `site.ts` feed navigation and sitemap discovery. Adding a route requires deciding its navigation and indexing policy; routes absent from those arrays may need an explicit sitemap entry.
- `hasGalleryPhotos()` controls gallery indexing and sitemap inclusion. Preserve the conditional policy. `site.url` supplies absolute URLs to metadata, robots, sitemap, and structured data.
- The contact endpoint is `src/app/api/contact/route.ts`; validation and delivery live in `src/lib/server/contact.ts`. Preserve validation, request limits, honeypot handling, provider timeouts, and guest-facing error states. It calls Resend with server-side `fetch`; no SDK is needed. `npm test` covers mocked delivery. Never log or expose API keys.
- Check installed packages before adding a dependency. Preserve the npm lockfile when dependencies change. Do not run broad upgrades as part of an unrelated task.

Useful installed guides: `01-app/01-getting-started/05-server-and-client-components.md`, `12-images.md`, `14-metadata-and-og-images.md`, and the metadata file-convention guides under `01-app/03-api-reference/03-file-conventions/01-metadata/`.
