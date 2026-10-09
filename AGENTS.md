<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

# Codex project instructions

Château Capitaine restaurant website: Next.js App Router, TypeScript, Tailwind CSS v4, npm. Business content is in `src/lib/data/`; shared UI is in `src/components/`.

## Required workflow

Always **Research → Plan → Build → Verify**, in that order. Scale the depth to the task: local inspection and a one-sentence plan suffice for a simple edit. Browse for changing or uncertain information, new API decisions, or explicit research requests. Prefer official documentation and primary evidence. Before editing, identify acceptance criteria and affected files; then complete the authorized work without routine plan-approval pauses.

## Efficient execution

- Check `git status --short`; preserve unrelated edits. Read `next.md` when present and verify its relevant state against the repository; `HANDOFF.md` is a compatibility pointer.
- Use scoped `rg` searches and read only relevant files/guides. Batch independent reads; avoid whole-repository dumps, repeated instructions, and automatic multi-agent review chains. Use one agent unless delegation is requested.
- Write complete implementations in files. Minimize redundant tool output and chat narration, never required work or useful verification. Do not print complete files unless requested.
- Keep personal model, reasoning, permission, and credential settings outside project instructions. Do not force maximal reasoning or weaken sandbox controls to save time.

## Read only when relevant

- Process, task briefs, and token measurement: [docs/codex-workflow.md](docs/codex-workflow.md).
- UI and branding: [docs/design.md](docs/design.md). Preserve the established black-and-gold identity unless the user requests a change.
- Code, routes, metadata, and content: [docs/technical.md](docs/technical.md).
- Verification: [docs/validation.md](docs/validation.md).
- Substantial/multi-session planning: [PLANS.md](PLANS.md).
- Backend work: [next.md](next.md) for the starting slice, then the relevant section of [the roadmap](docs/plans/backend-roadmap.md).
- Workflow evidence or tuning: [docs/research.md](docs/research.md).

Repository skills live in `.agents/skills/`: `new-page`, `handoff`, `recreate-design-from-screenshot`, `site-visual-design`, and `brand-assets`. Load only the relevant skill; routine edits need no skill stack.

## Done and Git

Application edits require passing `npm run lint` and `npm run build`; UI work also requires relevant browser checks. Documentation-only edits need link/config checks and diff review. Report unrun or blocked checks accurately. On Windows, use `npm.cmd`/`npx.cmd` if PowerShell blocks the `.ps1` wrappers.

Review the scoped diff before finishing. Commit only when asked; push or deploy only when explicitly authorized. Never expose secrets or send real test emails without authorization. Save a short handoff only when meaningful unfinished state remains.

For backend work, update `next.md` and roadmap progress after every completed feature or slice. Tell the user when a verified checkpoint is ready for clearing context. Present a concrete file/diff/check review before asking for commit and push authorization; see the roadmap for checkpoint details.
