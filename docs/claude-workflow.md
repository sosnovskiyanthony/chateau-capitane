# Claude Code workflow

Adopted 2026-10-09 when Claude Code took over building from Codex. Codex keeps its own setup and reviews/refactors later. The operating rules live in [CLAUDE.md](../CLAUDE.md); this file records why.

## Evidence behind each rule

| Rule | Evidence |
| --- | --- |
| Explore → plan → build → verify; skip the plan for one-sentence changes | Anthropic's [Claude Code best practices](https://code.claude.com/docs/en/best-practices): separate research/planning from implementation "to avoid solving the wrong problem"; "if you could describe the diff in one sentence, skip the plan." |
| Every slice ends with a runnable check and shown evidence | Same guide: verification is "the difference between a session you watch and one you walk away from." An agent-evaluation preprint ([arXiv 2604.11270](https://arxiv.org/pdf/2604.11270)) found 100% self-reported vs 57% verified success, so claims need an independent signal. |
| Small slices, automated tests, review before merge | Google [DORA 2025](https://cloud.google.com/discover/how-test-driven-development-amplifies-ai-success): small batches and strong version control/testing amplify AI benefits; AI adoption without them correlates with delivery instability. |
| Do not trust "looks done" | [Stack Overflow 2025 survey](https://venturebeat.com/ai/stack-overflow-data-reveals-the-hidden-productivity-tax-of-almost-right-ai-code) (49k devs): 66% cite "almost right" AI output as their top frustration. [METR RCT](https://www.infoq.com/news/2025/07/ai-productivity) (July 2025): experienced developers were 19% slower with AI on mature codebases while believing they were faster. Measure, don't assume. |
| Short CLAUDE.md, `next.md` handoff, `/clear` between milestones | Anthropic guide: performance degrades as context fills; bloated CLAUDE.md files get ignored. Chroma's [Context Rot](https://research.trychroma.com/context-rot) report (18 models) shows reliability drops as input grows, even on simple tasks. |
| Fresh-context review (`/code-review`) before commit, fixing only real gaps | Anthropic guide, "Add an adversarial review step", with its warning that chasing every reviewer finding causes over-engineering. |

## Tooling

- **typescript-lsp plugin** (project scope): flags type errors right after edits. Needs global `typescript-language-server`.
- **Playwright MCP** (`.mcp.json`, same command as `.codex/config.toml`): browser checks and screenshots. Per [playwright.dev](https://playwright.dev/mcp/clients/claude-code).
- **Already enabled user plugins**: context7 (current library docs), code-review/simplify (bundled), claude-security, frontend-design.
- **Docker Desktop**: required for the full local Supabase stack (B02c). Supabase lists Docker/Podman as the Windows prerequisite; its native runtime does not support Windows ([docs](https://supabase.com/docs/guides/local-development/docker-and-native-runtimes)).
- `.claude/settings.json` allowlists routine checks and local commits and denies push, deploy, live migrations, and reading real `.env` files.

## Owner decisions (2026-10-09)

- Claude chooses priority order. Stop only for decisions, permissions, or payments.
- Commit automatically after each verified slice; never push without asking.
- Plain-English reports; tell the owner to `/clear` at milestones.
