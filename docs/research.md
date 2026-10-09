# Evidence for the Codex workflow

Researched 2026-10-08. This is an evidence-informed starting workflow, not a proven universal optimum. The objective is accepted, verified tasks per token, with completion quality as a constraint. Neither fewer Markdown bytes nor a shorter final answer proves lower total inference cost.

## Primary evidence

| Source | Observed result or documented behavior | Decision and limits |
| --- | --- | --- |
| [Evaluating AGENTS.md, v3, 2026-09-29](https://arxiv.org/html/2602.11988v3) | Evaluates SWE-bench and CTXbench; CTXbench has 138 tasks across 12 Python repositories. Context files do not generally improve success, and average inference cost rises over 20%. | Keep only necessary project constraints and avoid duplicated repository narration. This is Python issue-resolution evidence, not a Next.js or current-model guarantee. The paper also finds no strong length-only effect: shorter files alone are not a demonstrated optimization. |
| [Two-agent context ablation, 2026](https://arxiv.org/html/2607.27250v1) | 288 evaluated runs across 17 tasks and 3 repositories. Codex pass rates: no context 58.8%, always-on 56.9%, selective 52.9%; no statistically detectable strategy effect. Codex tool calls were 32 across strategies; output tokens and duration varied by about ±3.8%. | Do not promise that selective loading improves correctness or Codex cost. Small sample, low power, different injection channels, and older model setup limit generalization. Measure the actual project workflow. |
| [Lost in the Middle, 2023/2024](https://arxiv.org/abs/2307.03172) | Retrieval and multi-document QA performance can depend on relevant information's position in long contexts. | Avoid dumping unrelated documents into a task. This is historical retrieval/QA evidence, not a quantitative result for contemporary Codex coding. |

## Official Codex guidance

- [Best practices](https://learn.chatgpt.com/guides/best-practices): practical, accurate project instructions, clear success criteria, planning for complex work, and testing/review. Our staged workflow is the owner's preference; the documentation does not prove it minimizes tokens.
- [AGENTS.md discovery](https://learn.chatgpt.com/docs/agent-configuration/agents-md): project instructions load automatically, with directory scoping and a default combined 32 KiB cap. Keep the root file a small map, and read linked detail only when applicable.
- [Skills](https://learn.chatgpt.com/docs/build-skills): Codex discovers repository skills in `.agents/skills`; names/descriptions are initially available, and bodies load when selected. Consolidate overlapping skills and give each a narrow trigger.
- [Skill evals](https://developers.openai.com/blog/eval-skills): evaluate a prompt, captured trace/artifacts, and a few outcome/process/efficiency checks. Use observable acceptance criteria rather than judging response style alone.
- [MCP configuration](https://learn.chatgpt.com/docs/extend/mcp?surface=cli): Codex uses TOML MCP server configuration. Project-level configuration is subject to project trust. Migrate the existing browser capability rather than maintain a separate client-specific JSON configuration.

## Project evaluation protocol

No paired project benchmark was run during the migration itself. A subsequent [six-run source-supplied audit pilot](token-benchmark.md) found 8.96% more reported tokens with the current guidance and equal correctness; it did not establish savings or measure the full coding workflow. The following is the protocol for broader validation; perform it when workflow tuning is requested rather than launching expensive repeat runs for routine work.

1. Choose representative tasks: update hours without inconsistent copies; add a metadata-correct page; fix a mobile navigation issue; adjust contact validation without regressions; implement a supplied visual reference.
2. Define acceptance checks before running. Use the same clean source snapshot, task brief, model, effort, tools, network access, and environment for each configuration. Use isolated disposable copies; do not mutate the active working tree or send real emails.
3. Compare the current workflow to one changed variable at a time, such as a shorter root file or a consolidated skill. Use at least three runs per task as an exploratory pilot; that sample cannot support a strong statistical claim. Randomize run order and record warm/cold cache conditions.
4. Record task acceptance, check failures, retries, all agents' input/output/reported reasoning tokens where available, cached tokens separately where reported, wall time, and tool calls. Use Codex JSON traces if the installed CLI supports them (`codex exec --help` first). Missing metrics remain unknown; never estimate them from characters as if measured.
5. Compare total tokens across all attempts divided by accepted tasks, and report the acceptance rate alongside it. For API billing, use reported cached/uncached usage and current pricing; ChatGPT subscription limits are not equivalent to API prices. Keep correctness and visual quality at least as good before adopting a cost optimization.

Suggested result columns: task, configuration, run, model/effort, accepted, input tokens, cached input, output tokens, reasoning tokens if separate, seconds, tool calls, retries, check results. Avoid double-counting reasoning already included in output usage. Zero accepted tasks makes cost per accepted task undefined.

## Practical defaults inferred for this repository

One agent, targeted file discovery, short task plans, reused research, complete workspace edits, proportionate validation, and concise reports reduce avoidable work by design. These are engineering choices to evaluate, not benchmark-proven percentage savings. Keep useful project invariants even if they consume tokens. Increase research, effort, or review when the task's ambiguity or consequences justify it.

## Migration audit, 2026-10-08

The previous `.claude` and `.agents` trees contained 86 Markdown files totaling 698,744 bytes in the filesystem inventory. Their overlapping design libraries, client-specific agents, rules, scripts, and skill manifest were replaced with five project skills and linked Codex guides. The new instruction/document collection was about 29 KB before this audit section, with a 3,409-byte root `AGENTS.md`. These are text-storage measurements with different file scopes, not measured session tokens: the previous collection was not all automatically loaded either.

Preserved: site design requirements, typed content sources, metadata conventions, the installed Next.js-managed block, new-page and handoff workflows, screenshot verification, and the existing Playwright command. General mobile-app, slide, alternate-aesthetic, and standalone-artifact workflows were retired from this restaurant repository rather than copied into Codex discovery. Project skills are authored locally; the old upstream skill-lock hashes no longer describe them.

Verification: all five skill frontmatters parsed as YAML and passed structural checks, 17 local Markdown links resolved, TOML parsed successfully, and Next.js confirmed its managed rules were current. The bundled Python skill validator lacked PyYAML; the already installed `js-yaml` parser was used for equivalent frontmatter checks without adding a dependency. Lint passed after temporary-directory cleanup settled. The production build passed with network access after the sandboxed attempt could not fetch Google Fonts; TypeScript and static-page generation succeeded. Next.js reported an existing parent-directory lockfile warning. MCP configuration was checked, but the browser server was not launched or live-tested during this documentation migration.

Application source, business data, images, dependencies, and existing website edits were not changed by the migration. No commit, push, global tool uninstall, paired workflow benchmark, or new browser QA was performed.
