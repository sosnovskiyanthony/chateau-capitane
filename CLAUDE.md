@AGENTS.md

# Château Capitaine

SEO-focused marketing website for Château Capitaine, built with Next.js.

## Stack

- Next.js (App Router), TypeScript
- Tailwind CSS
- Deployed as a standard Next.js app (not static export)

## Commands

- `npm run dev` — start dev server (http://localhost:3000)
- `npm run build` — production build (also type-checks)
- `npm run lint` — run ESLint

## Structure

- `src/app/page.tsx` — homepage
- `src/app/<route>/page.tsx` — one folder per route (e.g. `about`, `gallery`, `contact`)
- `src/app/layout.tsx` — root layout, global `<html>`/`<body>`, fonts
- `src/app/sitemap.ts` / `src/app/robots.ts` — generate `/sitemap.xml` and `/robots.txt`; update `baseUrl` in both when the real domain is set
- `src/app/globals.css` — Tailwind entrypoint and global styles

## Conventions

- Prefer Server Components; only add `"use client"` when a component needs interactivity (state, effects, browser APIs).
- Every route's `page.tsx` must export a `Metadata` object (or `generateMetadata`) with a specific `title` and `description` — never leave the default Next.js placeholder metadata.
- Exactly one `<h1>` per page, matching the page's primary topic.
- Use `next/image` for all images, not raw `<img>` tags, so they're optimized and get real width/height.
- Use semantic HTML (`<nav>`, `<main>`, `<footer>`, etc.) over generic `<div>`s where it fits.
- Keep Tailwind utility classes inline; don't introduce a CSS-in-JS or separate stylesheet system.
- When adding a new page, update `src/app/sitemap.ts` with its URL.

## Available skills & agents

- Skill `recreate-design-from-screenshot` — given a reference screenshot, build/iterate a page to match it pixel-for-pixel.
- Skill `new-page` — scaffold a new route following this project's page/metadata conventions.
- Agent `seo-reviewer` — audits a page or the whole site for SEO issues (metadata, headings, alt text, links).
