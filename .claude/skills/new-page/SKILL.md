---
name: new-page
description: Scaffold a new route/page in this Next.js site following project conventions (metadata, structure, sitemap entry). Use when the user asks to add a new page or section to the site (e.g. "add a rooms page", "create a events page").
---

# New Page

## Steps

1. Create `src/app/<route>/page.tsx` (kebab-case route folder matching the URL, e.g. `src/app/wedding-venue/page.tsx` for `/wedding-venue`).
2. Export a `Metadata` object with a specific `title` (format: `"<Page Name> | Château Capitaine"`) and a specific `description` — never leave placeholder text.
3. Default-export the page component as a Server Component (no `"use client"` unless it needs interactivity).
4. Use exactly one `<h1>` matching the page's topic, and semantic HTML (`<main>`, `<section>`, etc.).
5. Add the new route to `src/app/sitemap.ts` with an appropriate `changeFrequency`/`priority`.
6. If the page should appear in site navigation, add a link to it wherever the nav is defined (check `src/app/layout.tsx` or a shared header component).

## Verification

- Run `npm run build` and confirm the new route compiles and appears in the route list.
- Visit the route in `npm run dev` and confirm it renders.
