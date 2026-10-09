# Execution plans

Use this format for substantial or multi-session work after research and before implementation. Small edits need only a short plan in the conversation. Create a task-specific plan under `docs/plans/` only when durable state is useful; this file describes the format and is not a queue of unfinished tasks.

## Plan contents

- **Outcome:** requested behavior and observable acceptance criteria.
- **Research:** relevant local files, source links, findings, and unresolved assumptions. Distinguish evidence from inference.
- **Scope:** files/routes affected, existing user changes to preserve, and dependencies or external effects.
- **Steps:** ordered implementation actions, each with a concrete result.
- **Verification:** commands, browser checks, and behavior checks appropriate to the change.
- **Risks:** meaningful failure modes, mitigation, and rollback where warranted.
- **Progress:** completed steps, exact check outcomes, decisions, blockers, and next action. Replace stale information rather than accumulate a transcript.

Research → Plan → Build → Verify remains the order. Update the plan when new findings change the approach. Self-review before building; no automatic reviewer-agent chain or routine manual sign-off. Continue authorized work until acceptance criteria are met or a required external decision blocks progress.
