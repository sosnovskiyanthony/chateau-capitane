@AGENTS.md

# Château Capitaine

SEO-focused marketing website for Château Capitaine. Next.js (App Router) + TypeScript + Tailwind CSS.

## Commands

- `npm run dev` / `npm run build` / `npm run lint`

## Structure

- `src/app/<route>/page.tsx` — one folder per route (e.g. `about`, `gallery`, `contact`)
- `src/app/layout.tsx` — root layout
- `src/app/sitemap.ts` / `src/app/robots.ts` — update `baseUrl` in both once the real domain is set

## Rules — read the relevant file before acting, not all of them every time

- Visual/brand decisions → `.claude/rules/design-rules.md`
- Coding conventions, metadata, markup defaults → `.claude/rules/technical-defaults.md`
- Adding pages, verification steps, git process → `.claude/rules/workflow.md`

## Skills & agents

- Skill `recreate-design-from-screenshot`
- Skill `new-page`
- Agent `seo-reviewer`
