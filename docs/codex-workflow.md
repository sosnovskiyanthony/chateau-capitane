# Codex workflow

Owner preference: always **Research → Plan → Build → Verify**. Optimize for useful, verified work per token. Complete the requested implementation in files; keep chat updates and final reports concise.

## 1. Research

- Establish the requested outcome and acceptance criteria. Check `git status --short`; preserve existing changes. Read [next.md](../next.md) when present and verify relevant state against current files.
- Use `rg --files` and scoped `rg -n` searches to locate implementation and callers. Read relevant files and one applicable guide, rather than every document or skill.
- Read the installed Next.js documentation before Next.js code changes. Local source and installed documentation are the first research sources for routine edits.
- Browse for new or uncertain APIs, changing facts, comparisons, or an explicit research request. Prefer official documentation and original papers. Record links and the decisions they support. Reuse verified research until its assumptions change; do not browse for every typo.
- Stop research when the affected behavior, constraints, implementation approach, and verification are clear. Escalate conflicting evidence or a missing critical requirement; continue independent work when possible.

## 2. Plan

For a small edit, state the change and check in one sentence before editing. For larger work, state the affected files, ordered steps, acceptance criteria, risks, and checks. Use [PLANS.md](../PLANS.md) for work spanning sessions or substantial architectural changes.

Check the plan against the request and repository constraints yourself. Proceed with authorized work without adding a routine approval gate. Ask only when a required decision or permission is missing. Use one agent by default; delegate only when requested and when independent tasks justify the extra context and coordination. Avoid automatic researcher, plan-reviewer, synthesizer, and reviewer chains.

## 3. Build

- Make cohesive edits through the existing architecture. Reuse components and data sources. Avoid new dependencies without a demonstrated need.
- Batch independent searches and reads; keep dependent changes and checks ordered. Limit tool output to useful matches, relevant excerpts, and error summaries. Do not hide failures or discard context necessary for correctness.
- Load one relevant skill when it adds value. Do not stack competing aesthetic systems or reread the same instructions every turn.
- Write complete code to the workspace. Do not print entire files in chat unless requested. Concise communication must not mean incomplete implementation.
- Revisit research and the plan when new evidence materially changes the approach; do not persist with a disproven plan.

## 4. Verify and finish

Follow [validation.md](validation.md), review the scoped diff, and verify acceptance criteria. Run checks again only after a relevant edit or unresolved failure. Report the outcome, checks, and material limitations accurately. Never claim a browser inspection, benchmark, or passing command that did not happen.

Keep a task in its existing conversation while the context remains useful. For backend work, update [next.md](../next.md) and [roadmap progress](plans/backend-roadmap.md) after every completed feature or slice. Capture objective, decisions, relevant files, exact checks, blockers and the next action; replace stale notes rather than append a transcript. `HANDOFF.md` is only a pointer to this canonical handoff. A new session must verify the snapshot before trusting it.

Tell the user when a stable verified checkpoint is ready for clearing context. Before asking for Git commit/push approval, present the proposed file groups, reviewed diff, check results, target branch/remote and any deployment effect. Approval may cover a stated batch; do not ask again for the same scope. Backend sequencing and release checkpoints are in the roadmap.

## Efficient task brief

Provide the outcome, affected page or feature, constraints or reference, and observable acceptance criteria. Example:

> Add an accessible FAQ to `/private-events` using the existing brand and components. Research the relevant local patterns first, then plan and build. It must work with keyboard input, avoid horizontal overflow at 375px, and pass lint and build. Preserve unrelated changes.

Choose model and reasoning effort in Codex settings according to task difficulty. Start with your normal coding setting; increase effort for demonstrated ambiguity, repeated failures, or difficult architecture. Do not hardcode a model, maximal reasoning, or a speculative context limit in repository configuration. Available models and accounting vary by client and plan.

## Measure before tuning

See [research.md](research.md) for evidence and limitations. Track accepted task completion and total tokens, including retries and any delegated agents, rather than output length. Keep root instructions focused on project-specific constraints and route detailed guidance here. Add rules for demonstrated recurring failures; remove stale or duplicated rules.
