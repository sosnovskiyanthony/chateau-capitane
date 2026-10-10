@AGENTS.md

# Claude Code additions

Claude continues the build; Codex later refactors and reviews. Keep Codex files (`AGENTS.md`, `.codex/`, `.agents/skills/`, `docs/codex-workflow.md`) intact; read an `.agents/skills/*/SKILL.md` when its task applies. Workflow evidence: [docs/claude-workflow.md](docs/claude-workflow.md).

## Session loop

1. Start: read `next.md`, check `git status --short`, then work the named slice. Do not redo finished research.
2. Research only what is new or uncertain; prefer official docs (context7 for libraries, `node_modules/next/dist/docs/` for Next.js).
3. Plan in one short list: acceptance criteria, files, checks. Use plan mode only for multi-file or uncertain work.
4. Build the smallest change that meets the criteria.
5. Verify with evidence: `npm.cmd test`, `npm.cmd run lint`, `npm.cmd run build`; `npm.cmd run test:db` for database work; Playwright MCP screenshots at 375/768/1280px for UI. A blocked check is reported as blocked, never as passed.
6. For non-trivial slices, run `/code-review` on the diff before committing; fix only correctness or requirement gaps.
7. Commit automatically after each verified slice (owner approved, 2026-10-09). Never push, deploy, provision paid services, run live migrations, or send real email without asking.
8. Update `next.md` (and roadmap progress for backend work), commit, then continue to the next slice.

## Talking to the owner

- The owner is not a developer. Report in plain English: what changed, why, what was tested, what is still unchecked.
- Stop only for decisions, permissions, or payments. Ask in plain English with a recommended option.
- When context is getting long or a milestone is done, update `next.md`, commit, and tell the owner to run `/clear`; the next session starts from `next.md`.
