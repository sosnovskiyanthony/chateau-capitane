import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";
import { Script } from "node:vm";
import ts from "typescript";

function load(path, imports) {
  const { outputText } = ts.transpileModule(readFileSync(path, "utf8"), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  });
  const context = { exports: {}, URL, TextDecoder, AbortController, Response,
    setTimeout: (callback, delay) => setTimeout(callback, Math.min(delay, 25)), clearTimeout,
    require: (name) => { assert.ok(Object.hasOwn(imports, name), `Unexpected dependency: ${name}`); return imports[name]; } };
  new Script(outputText).runInNewContext(context);
  return context.exports;
}
const persistence = load("src/lib/server/inquiries/persistence.ts", { "server-only": {} });
const { runNotificationWorker } = load("src/lib/server/inquiries/notification-worker.ts", { "server-only": {}, "./persistence": persistence });
const configuration = { url: "https://example.supabase.co", secretKey: "sb_secret_test" };
const job = (n, recipient = "staff@example.com") => ({ job_id: `00000000-0000-4000-8000-00000000000${n}`,
  lease_token: `10000000-0000-4000-8000-00000000000${n}`, attempt: 1, sender: "Website <site@example.com>",
  recipient, reply_to: "guest@example.com", subject: "Inquiry", body: "Body" });

/** Fake PostgREST + Resend. `resend` maps each send to a Response or a thrown error. */
function harness(jobs, resend, { stored = true } = {}) {
  const sends = [], completions = [], errors = [];
  const fetch = async (url, init) => {
    if (url.endsWith("/rpc/claim_notification_jobs")) return Response.json(jobs);
    if (url.endsWith("/rpc/complete_notification_job")) { completions.push(JSON.parse(init.body)); return Response.json(stored); }
    assert.equal(url, "https://api.resend.com/emails");
    sends.push({ key: init.headers["Idempotency-Key"], body: JSON.parse(init.body) });
    const result = resend(sends.length - 1, init.signal);
    if (result instanceof Error) throw result;
    return result;
  };
  return { sends, completions, errors,
    run: () => runNotificationWorker({ configuration, resendApiKey: "re_test", fetch, logError: (code) => errors.push(code) }) };
}

test("each provider outcome reaches an explicit stored state with a stable idempotency key", async () => {
  const responses = [Response.json({ id: "msg_1" }), new Response("{}", { status: 429 }), new Response("", { status: 503 }),
    new Response("{}", { status: 422 }), new Response("{}", { status: 409 }), Response.json({}), new Response("{}", { status: 401 })];
  const h = harness(responses.map((_, i) => job(i)), (i) => responses[i]);
  assert.deepEqual({ ...await h.run() }, { claimed: 7, accepted: 1, deferred: 6, lost: 0 });
  assert.deepEqual(h.sends.map((send) => send.key), responses.map((_, i) => `notification/${job(i).job_id}`));
  assert.deepEqual(h.sends[0].body, { from: "Website <site@example.com>", to: "staff@example.com", reply_to: "guest@example.com", subject: "Inquiry", text: "Body",
    tags: [{ name: "notification_job", value: job(0).job_id }] });
  assert.deepEqual(h.completions.map((c) => [c.p_outcome, c.p_provider_message_id, c.p_error]), [
    ["accepted", "msg_1", null], ["retryable", null, "rate_limited"], ["ambiguous", null, "provider_503"],
    ["rejected", null, "provider_422"], ["ambiguous", null, "provider_409"], ["ambiguous", null, "invalid_acknowledgment"],
    ["retryable", null, "provider_401"]]);
  assert.equal(h.completions[0].p_lease_token, job(0).lease_token);
});

test("timeouts and lost responses are ambiguous, never failures that invite a fresh resend", async () => {
  const h = harness([job(1), job(2)], (i, signal) => i === 0
    ? new Promise((_, reject) => signal.addEventListener("abort", () => reject(new Error("aborted"))))
    : new TypeError("socket closed"));
  await h.run();
  assert.deepEqual(h.completions.map((c) => [c.p_outcome, c.p_error]), [["ambiguous", "provider_timeout"], ["ambiguous", "provider_unavailable"]]);
});

test("a full batch of maximum-size jobs fits the claim bound", async () => {
  const big = (n) => ({ ...job(n), body: "".repeat(10_000) });
  const h = harness([1, 2, 3, 4, 5].map(big), () => Response.json({ id: "msg" }));
  assert.equal((await h.run()).accepted, 5);
});

test("synthetic .invalid jobs are never delivered", async () => {
  const h = harness([job(1, "staff@example.invalid")], () => assert.fail("sent synthetic job"));
  await h.run();
  assert.equal(h.sends.length, 0);
  assert.deepEqual([h.completions[0].p_outcome, h.completions[0].p_error], ["rejected", "synthetic_address"]);
});

test("a lost lease and a failed claim are reported, not treated as success", async () => {
  const lost = harness([job(1)], () => Response.json({ id: "msg" }), { stored: false });
  assert.equal((await lost.run()).lost, 1);
  assert.deepEqual(lost.errors, ["worker_outcome_not_stored"]);
  const errors = [];
  const summary = await runNotificationWorker({ configuration, resendApiKey: "re_test",
    fetch: async () => new Response("", { status: 500 }), logError: (code) => errors.push(code) });
  assert.equal(summary, null);
  assert.deepEqual(errors, ["worker_claim_failed"]);
});
