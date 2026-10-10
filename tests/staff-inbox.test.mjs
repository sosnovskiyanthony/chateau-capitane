import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";
import { Script } from "node:vm";
import ts from "typescript";

const { outputText } = ts.transpileModule(readFileSync("src/lib/server/inquiries/staff-inbox.ts", "utf8"), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
});
const context = { exports: {}, Intl, Date, Number, require: (name) => ({ "server-only": {}, "./persistence": {} })[name] };
new Script(outputText).runInNewContext(context);
const inbox = context.exports;
const ID = "7f3c9a52-1b2d-4e5f-8a9b-0c1d2e3f4a5b";

test("page cursors round-trip; malformed cursors fall back to the first page", () => {
  const row = { createdAt: "2026-10-10T14:03:22.123456+00:00", id: ID };
  assert.deepEqual({ ...inbox.parseCursor(inbox.cursorOf(row)) }, { at: row.createdAt, id: ID });
  for (const bad of [undefined, ["x"], "", "nope|" + ID, `${row.createdAt}|not-a-uuid`, `${row.createdAt}|${ID}|x`, "x".repeat(81)]) {
    assert.equal(inbox.parseCursor(bad), null);
  }
});

test("notification problems are flagged; normal progress is not", () => {
  const n = (state, delivery = null, attempts = 1) => inbox.describeNotification({ state, attempts, lastError: null, delivery });
  for (const ok of [n("accepted"), n("accepted", "email.delivered"), n("leased"), n("pending", null, 0), n("accepted", "email.sent")]) {
    assert.equal(ok.problem, false, ok.label);
  }
  for (const bad of [n("failed"), n("uncertain"), n("pending"), n("accepted", "email.bounced"), n("accepted", "email.complained"),
    n("accepted", "email.delivery_delayed"), inbox.describeNotification(null)]) {
    assert.equal(bad.problem, true, bad.label);
  }
  assert.equal(n("accepted", "email.bounced").label, "Staff email bounced");
});
