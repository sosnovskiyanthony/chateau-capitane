"""Paired read-only Codex instruction pilot; no edits to application files."""

import argparse
import hashlib
import json
import random
import re
import shutil
import subprocess
import tempfile
import time
from datetime import datetime, timezone
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
TASK = """Perform a read-only maintenance audit of this restaurant project.
Research the relevant local implementation, then briefly plan the answer, then
produce and verify the requested result. Do not edit files, install anything,
use network/browser tools, launch other agents, or run build/lint for this audit.
Find the single source of truth for weekday lunch opening hours. Identify the
exact property to change to move the lunch closing time to 17:00 while leaving
dining hours unchanged. Find EVERY source file that directly displays the lunch
hours through that shared property. Inspect actual source; do not guess from docs.
Return only JSON with these keys: source_file, property, current_close, new_close,
dining_close, days, display_consumers (array of repository-relative file paths).
All path strings must use forward slashes. Do not change the actual hours.
"""


def source_prompt(expected):
    instruction = TASK.replace(
        "Research the relevant local implementation", "Research the supplied implementation"
    ).replace(
        "Inspect actual source; do not guess from docs.",
        "The complete relevant source files are supplied below; inspect them, not documentation. "
        "This is a closed-context benchmark: DO NOT CALL ANY TOOLS or read local files. "
        "No other source file directly displays the shared lunch-hours property.",
    )
    files = [expected["source_file"], *expected["display_consumers"]]
    return instruction + "\n\n" + "\n\n".join(
        f"SOURCE FILE: {name}\n```tsx\n{(ROOT / name).read_text(encoding='utf-8')}\n```"
        for name in files
    )


def git_text(relative):
    return subprocess.check_output(
        ["git", "show", f"HEAD:{relative}"], cwd=ROOT, text=True, encoding="utf-8"
    )


def source_digest():
    digest = hashlib.sha256()
    for file in sorted((ROOT / "src").rglob("*")):
        if file.is_file():
            digest.update(file.relative_to(ROOT).as_posix().encode())
            digest.update(file.read_bytes())
    return digest.hexdigest()


def make_fixture(parent, name, variant):
    fixture = parent / name
    fixture.mkdir()
    shutil.copytree(ROOT / "src", fixture / "src")
    for name in ("package.json", "tsconfig.json", "next.config.ts", "README.md"):
        shutil.copy2(ROOT / name, fixture / name)
    if variant == "current":
        for name in ("AGENTS.md", "PLANS.md"):
            shutil.copy2(ROOT / name, fixture / name)
        shutil.copytree(ROOT / "docs", fixture / "docs")
        shutil.copytree(ROOT / ".agents", fixture / ".agents")
    else:
        current = (ROOT / "AGENTS.md").read_text(encoding="utf-8")
        end = current.index("<!-- END:nextjs-agent-rules -->") + len(
            "<!-- END:nextjs-agent-rules -->"
        )
        legacy = git_text("CLAUDE.md").replace("@AGENTS.md", "").replace(
            ".claude/rules/", "docs/legacy-rules/"
        )
        (fixture / "AGENTS.md").write_text(
            current[:end] + "\n\n" + legacy, encoding="utf-8"
        )
        rules = fixture / "docs" / "legacy-rules"
        rules.mkdir(parents=True)
        for name in ("design-rules.md", "technical-defaults.md", "workflow.md"):
            (rules / name).write_text(git_text(f".claude/rules/{name}"), encoding="utf-8")
    return fixture


def extract_answer(events):
    messages = [
        event.get("item", {}).get("text", "")
        for event in events
        if event.get("type") == "item.completed"
        and event.get("item", {}).get("type") == "agent_message"
    ]
    for message in reversed(messages):
        candidate = re.sub(r"^```(?:json)?\s*|\s*```$", "", message.strip())
        try:
            return json.loads(candidate)
        except json.JSONDecodeError:
            continue
    return None


def expected_answer():
    source = (ROOT / "src/lib/data/site.ts").read_text(encoding="utf-8")
    lunch = re.search(r"lunchSpecial:\s*\{([\s\S]*?)\}", source).group(1)
    dining = re.search(r"dining:\s*\{([\s\S]*?)\}", source).group(1)
    consumers = []
    for file in sorted((ROOT / "src").rglob("*.tsx")):
        if "formatHours(site.hours.lunchSpecial)" in file.read_text(encoding="utf-8"):
            consumers.append(file.relative_to(ROOT).as_posix())
    return {
        "source_file": "src/lib/data/site.ts",
        "property": "site.hours.lunchSpecial.closes",
        "current_close": re.search(r'closes:\s*"([^"]+)"', lunch).group(1),
        "new_close": "17:00",
        "dining_close": re.search(r'closes:\s*"([^"]+)"', dining).group(1),
        "days": re.findall(r'"([^\"]+)"', re.search(r"days:\s*\[([^]]+)\]", lunch).group(1)),
        "display_consumers": consumers,
    }


def accepted(answer, expected):
    if not isinstance(answer, dict):
        return False
    return all(
        sorted(answer.get(key, [])) == sorted(value)
        if isinstance(value, list)
        else answer.get(key) == value
        for key, value in expected.items()
    )


def run_one(executable, fixture, output, label, timeout, expected, prompt):
    command = [
        executable, "exec", "--json", "--ephemeral", "--ignore-user-config",
        "--ignore-rules", "--skip-git-repo-check", "--sandbox", "read-only",
        "--cd", str(fixture), "-",
    ]
    started = time.monotonic()
    try:
        completed = subprocess.run(
            command, input=prompt, text=True, encoding="utf-8", errors="replace",
            capture_output=True, timeout=timeout, cwd=fixture,
        )
        stdout, stderr, code = completed.stdout, completed.stderr, completed.returncode
    except subprocess.TimeoutExpired as error:
        stdout = error.stdout or ""
        stderr = error.stderr or ""
        if isinstance(stdout, bytes):
            stdout = stdout.decode("utf-8", errors="replace")
        if isinstance(stderr, bytes):
            stderr = stderr.decode("utf-8", errors="replace")
        code = "timeout"
    (output / f"{label}.jsonl").write_text(stdout, encoding="utf-8")
    (output / f"{label}.stderr.txt").write_text(stderr, encoding="utf-8")
    events = []
    for line in stdout.splitlines():
        try:
            events.append(json.loads(line))
        except json.JSONDecodeError:
            pass
    usage = [event.get("usage") for event in events if event.get("type") == "turn.completed"]
    answer = extract_answer(events)
    result = {
        "label": label, "exit_code": code, "seconds": round(time.monotonic() - started, 2),
        "accepted": code == 0 and accepted(answer, expected) and "blocked by policy" not in stderr,
        "answer": answer,
        "blocked_commands": stderr.count("blocked by policy"),
        "usage": usage,
        "tool_calls": sum(event.get("type") == "item.started" and event.get("item", {}).get("type") in
                          ("command_execution", "mcp_tool_call", "web_search", "file_change") for event in events),
    }
    print(json.dumps(result), flush=True)
    return result


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--runs", type=int, default=3)
    parser.add_argument("--timeout", type=int, default=180)
    parser.add_argument("--output", type=Path, required=True)
    args = parser.parse_args()
    if not 1 <= args.runs <= 5:
        parser.error("Use 1 to 5 runs per configuration for this bounded pilot.")
    executable = shutil.which("codex")
    if not executable:
        parser.error("Codex CLI is unavailable.")
    args.output.mkdir(parents=True, exist_ok=True)
    if any(args.output.iterdir()):
        parser.error("Output directory must be empty; existing traces are never overwritten.")
    before = source_digest()
    expected = expected_answer()
    prompt = source_prompt(expected)
    order = [(variant, run) for run in range(1, args.runs + 1) for variant in ("legacy", "current")]
    random.Random(20261008).shuffle(order)
    summary = {
        "started_utc": datetime.now(timezone.utc).isoformat(),
        "cli_version": subprocess.check_output([executable, "--version"], text=True).strip(),
        "model": "installed CLI default; identical invocation; user config ignored",
        "prompt": prompt, "expected": expected, "order": order, "runs": [],
        "limitations": ["One read-only task, three repeats per configuration; exploratory only.",
                        "Legacy guidance reconstructed from Git HEAD, not the lost uncommitted collection.",
                        "Same current application source in both arms; no Claude runtime comparison.",
                        "Cache temperature uncontrolled; use reported cached input separately.",
                        "Source supplied in prompt; tool-free audit measures instruction overhead, not a full coding workflow.",
                        "No implementation, build, or browser-quality claim."],
    }
    # System temp keeps fixtures outside repository instruction-discovery ancestry.
    # Fixtures are retained for inspection; this runner never recursively deletes paths.
    parent = Path(tempfile.mkdtemp(prefix="codex-token-pilot-"))
    summary["fixtures"] = str(parent)
    for variant, run in order:
        label = f"{variant}-{run}"
        fixture = make_fixture(parent, label, variant)
        result = run_one(executable, fixture, args.output, label, args.timeout, expected, prompt)
        result["configuration"] = variant
        summary["runs"].append(result)
        summary["application_source_unchanged"] = source_digest() == before
        (args.output / "results.json").write_text(json.dumps(summary, indent=2), encoding="utf-8")
        if not result["usage"]:
            print("Stopped: no completed-turn token usage; inspect trace before further runs.", flush=True)
            return 1
    assert source_digest() == before, "Active application source changed during benchmark."
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
