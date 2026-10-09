# Token benchmark pilot — 2026-10-08

**Result: this test did not demonstrate token savings.** The current project guidance used 8.96% more reported input-plus-output tokens than the reconstructed legacy guidance on one source-supplied maintenance audit. All six audits returned correct answers.

| Metric | Legacy guidance | Current Codex guidance |
| --- | ---: | ---: |
| Accepted runs | 3 / 3 | 3 / 3 |
| Total input tokens | 56,916 | 62,047 |
| Cached input tokens, included above | 37,632 | 37,632 |
| Uncached input tokens | 19,284 | 24,415 |
| Output tokens | 413 | 420 |
| Input + output tokens | 57,329 | 62,467 |
| Tokens per accepted audit | 19,109.67 | 20,822.33 |
| Mean duration | 5.75 s | 7.17 s |

Reasoning tokens reported separately were 38 and 45 respectively; they are already part of output accounting and are not added again. Cached tokens remain part of input token counts. These figures are usage, not API dollar costs or ChatGPT subscription-limit estimates.

## What was tested

The task was to identify the shared weekday lunch-hours source, the exact property to move closing time from 16:30 to 17:00, unchanged dining closing time, applicable days, and all direct display consumers. The gold answer was derived independently from the active source. Both arms received identical complete relevant source in the prompt. No tools, code edits, installation, build, browser work, or email delivery were needed or allowed.

Each configuration ran three times in separate system-temporary fixtures, in reproducibly shuffled order. Both used Codex CLI `0.162.0-alpha.2`, the same command and installed CLI model/effort defaults, read-only sandboxing, ignored user configuration/rules, and ephemeral sessions. The concrete backend model was not pinned or captured; that limits reproducibility. Current fixtures included `AGENTS.md`, linked guides, and the five discoverable project skills. Legacy fixtures ported Git HEAD's `CLAUDE.md` into `AGENTS.md`, retained the same current Next.js-managed block, and restored the committed rules under temporary legacy-guide paths.

The application's current source was identical in both arms. A SHA-256 digest confirmed the active `src` tree stayed unchanged. The old uncommitted skill collection was deleted during migration and is not fully recoverable from Git, so this is not an exact before/after benchmark of the full original environment or a comparison against Claude Code.

## Limitations and interpretation

- One simple read-only task and three repetitions do not establish statistical significance or general coding productivity. Correctness was equal for this task only.
- Tool calls were zero in all six measured audits. The pilot tests instruction overhead and source comprehension, not file-discovery efficiency, implementation quality, reduced retries, or browser verification.
- Cache state was uncontrolled, although reported cache-read totals matched between arms. Current input usage varied between nominally identical runs; session/runtime context was not fully controlled.
- Filesystem text reduction is not inference-token reduction. The smaller skill collection did not offset the current guidance's measured overhead in this audit.
- The defensible next optimization to test is a shorter root instruction file, retaining necessary project constraints. A broader coding-task benchmark is needed before judging whether guidance pays for itself by preventing failures. No further instruction changes were made based solely on this pilot.

## Failed setup and total measurement scope

The first file-reading benchmark was stopped after child sessions' shell commands were rejected by execution policy. Three recorded runs failed acceptance; their usage is excluded from the paired success comparison above. Their reported input was 305,554 tokens, including 252,672 cached input tokens, plus 1,098 output tokens. They must not be mistaken for successful low-cost audits.

Including those failed setup attempts, recorded child sessions consumed 426,448 input-plus-output tokens, of which 327,936 were cached input. Usage for the supervising conversation is unavailable to the runner and is not included. The test used existing Codex authentication; no API dollar cost was measured. Policy restrictions were preserved; the corrected task supplied source rather than weakening the child sandbox.

## Artifacts and rerun

- [Successful runs, prompt, gold answer, and limitations](../benchmarks/token-savings/2026-10-08-context/results.json)
- [Aggregated usage](../benchmarks/token-savings/2026-10-08-context/summary.json)
- [Failed setup runs](../benchmarks/token-savings/2026-10-08/results.json)
- [Reusable runner](../scripts/benchmark-codex-tokens.py)

Each run's adjacent `.jsonl` and `.stderr.txt` files preserve the CLI trace and diagnostic output. Fixtures remain in system temporary storage at paths recorded in the results; no legacy configuration was restored to the active project.

To rerun, use a new empty output directory:

```powershell
python scripts/benchmark-codex-tokens.py --runs 3 --timeout 90 --output benchmarks/token-savings/new-pilot
```

The runner needs permission to create temporary fixtures and reach authenticated Codex inference. It stops if no completed-turn usage is available and never overwrites existing result files. The report above is a historical run, not a promise that later models or tasks will produce the same numbers.
