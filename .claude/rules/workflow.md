# Workflow

- New page: use the `new-page` skill, then add its URL to `src/app/sitemap.ts`.
- Recreating a design from a screenshot: use the `recreate-design-from-screenshot` skill; do at least 2 comparison rounds before stopping.
- Before calling page work done: run `npm run build` and `npm run lint`; both must pass clean.
- After adding or editing pages, consider running the `seo-reviewer` agent.
- Git: commit only when asked. Never push without explicit confirmation — this repo pushes to `sosnovskiyanthony/chateau-capitane` on GitHub.
