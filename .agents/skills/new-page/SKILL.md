---
name: new-page
description: Add a public route to this restaurant site with shared components, metadata, navigation, and indexing policy.
---

# Add a page with Codex

1. Research the nearest route, `src/lib/metadata.ts`, `src/lib/data/site.ts`, the installed Next.js routing/metadata guides, and `docs/technical.md`. Read `docs/design.md` for visual work.
2. Plan the route, content source, component reuse, navigation placement, indexing policy, and acceptance checks before editing.
3. Create `src/app/<kebab-case-route>/page.tsx` as a Server Component unless interactivity requires a client leaf. Use `pageMetadata` with a plain title, specific description, and canonical path; avoid repeating the site name in the title. Render one h1 and reuse the existing page header/layout patterns.
4. Add intended navigation to `navLinks` or `footerLinks` in `site.ts`. Those arrays feed the sitemap; inspect `sitemap.ts` and add an explicit entry if an indexable route belongs outside navigation. Preserve gallery's photo-dependent indexing. Do not index empty placeholder-only pages automatically.
5. Run lint and build, confirm the route renders, and inspect metadata, navigation, sitemap policy, keyboard behavior, and layouts at 375px, 768px, and 1280px. Report actual results and any blocked checks.
