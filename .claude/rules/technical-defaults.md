# Technical Defaults

- Server Components by default; add `"use client"` only for state, effects, or browser APIs.
- Every `page.tsx` exports a specific `Metadata` (title + description) — never the Next.js placeholder.
- Exactly one `<h1>` per page.
- Use `next/image` (never raw `<img>`) with real `width`/`height`.
- Use `next/link` for internal navigation.
- Semantic HTML over generic `<div>`s (`<nav>`, `<main>`, `<footer>`, `<section>`).
- Tailwind utility classes inline — no CSS-in-JS, no separate stylesheet system.
- No new dependencies without a clear need — check what's already installed first.
