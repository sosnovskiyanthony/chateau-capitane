import assert from "node:assert/strict";
import * as crypto from "node:crypto";
import { readFileSync } from "node:fs";
import { test } from "node:test";
import { Script } from "node:vm";
import ts from "typescript";
import { Webhook } from "svix";

function load(path, imports) {
  const { outputText } = ts.transpileModule(readFileSync(path, "utf8"), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  });
  const context = { exports: {}, Buffer, TextDecoder, AbortController, Response, Headers, setTimeout, clearTimeout,
    require: (name) => { assert.ok(Object.hasOwn(imports, name), `Unexpected dependency: ${name}`); return imports[name]; } };
  new Script(outputText).runInNewContext(context);
  return context.exports;
}
// Results come from another realm; compare as plain JSON.
const plain = (value) => JSON.parse(JSON.stringify(value));
const persistence = load("src/lib/server/inquiries/persistence.ts", { "server-only": {} });
const { handleResendWebhook, verifySignature } = load("src/lib/server/inquiries/delivery-webhook.ts",
  { "server-only": {}, "node:crypto": crypto, "./persistence": persistence });

// Signed with the maintained Svix library, the scheme Resend uses, so fixtures are independent of our code.
const secret = `whsec_${crypto.randomBytes(24).toString("base64")}`;
const now = Date.parse("2026-10-09T12:00:00Z");
const jobId = "00000000-0000-4000-8000-000000000001";
const event = (type = "email.delivered", data = {}) => JSON.stringify({ type, created_at: "2026-10-09T11:59:58.000Z",
  data: { email_id: "4ef9a417-02e9-4d39-ad75-9611e0fcc33c", from: "x", to: ["y"], subject: "z",
    tags: { notification_job: jobId }, ...data } });
function signed(body, { id = "msg_2b8Rx9", at = now, key = secret, headers = {} } = {}) {
  const signature = new Webhook(key).sign(id, new Date(at), body);
  return new Request("https://site.example/api/webhooks/resend", { method: "POST", body,
    headers: { "svix-id": id, "svix-timestamp": String(Math.floor(at / 1000)), "svix-signature": signature, ...headers } });
}
function harness(reply = "recorded") {
  const calls = [], errors = [];
  const fetch = async (url, init) => { calls.push({ url, args: JSON.parse(init.body) }); return reply instanceof Response ? reply : Response.json(reply); };
  return { calls, errors, run: (request, options = {}) => handleResendWebhook(request, { configuration: { url: "https://db.example", secretKey: "sb_secret_x" },
    secret, fetch, logError: (code) => errors.push(code), now, ...options }) };
}

test("verification agrees with the Svix library on valid, altered, expired, future and rotated signatures", async () => {
  const body = event();
  const svix = (request, text) => { try { new Webhook(secret).verify(text, Object.fromEntries(request.headers)); return true; } catch { return false; } };
  const cases = [
    [signed(body), body, true],
    [signed(body), body.replace("delivered", "bounced"), false],
    [signed(body, { at: now - 6 * 60_000 }), body, false],
    [signed(body, { at: now + 6 * 60_000 }), body, false],
    [signed(body, { at: now - 4 * 60_000 }), body, true],
    [signed(body, { key: `whsec_${crypto.randomBytes(24).toString("base64")}` }), body, false],
  ];
  const realNow = Date.now;
  Date.now = () => now;
  try {
    for (const [request, text, valid] of cases) {
      assert.equal(verifySignature(secret, request.headers, new TextEncoder().encode(text), now), valid);
      assert.equal(svix(request, text), valid);
    }
  } finally { Date.now = realNow; }
  // Rotation: any listed v1 signature may match; other versions are ignored.
  const good = signed(body).headers.get("svix-signature");
  const rotated = new Headers(signed(body).headers);
  rotated.set("svix-signature", `v2,${good.slice(3)} v1,AAAA ${good}`);
  assert.equal(verifySignature(secret, rotated, new TextEncoder().encode(body), now), true);
  rotated.set("svix-signature", `v2,${good.slice(3)}`);
  assert.equal(verifySignature(secret, rotated, new TextEncoder().encode(body), now), false);
});

test("a valid event is stored with its Svix ID, type, email ID, tagged job and time; nothing else", async () => {
  const h = harness();
  assert.deepEqual(plain(await h.run(signed(event()))), { status: 200, body: { ok: true } });
  assert.equal(h.calls[0].url, "https://db.example/rest/v1/rpc/record_delivery_event");
  assert.deepEqual(h.calls[0].args, { p_event_id: "msg_2b8Rx9", p_event_type: "email.delivered",
    p_email_id: "4ef9a417-02e9-4d39-ad75-9611e0fcc33c", p_job_id: jobId, p_occurred_at: "2026-10-09T11:59:58.000Z" });
  const untagged = harness();
  await untagged.run(signed(event("email.sent", { tags: { notification_job: "not-a-uuid" } })));
  assert.equal(untagged.calls[0].args.p_job_id, null);
  const listed = harness();
  await listed.run(signed(event("email.sent", { tags: [{ name: "other", value: "x" }, { name: "notification_job", value: jobId.toUpperCase() }] })));
  assert.equal(listed.calls[0].args.p_job_id, jobId);
  assert.equal((await harness("unrelated").run(signed(event()))).status, 200);
});

test("duplicates are acknowledged; storage failure and full backlog answer 503 so Resend retries", async () => {
  assert.equal((await harness("duplicate").run(signed(event()))).status, 200);
  const full = harness("overflow");
  assert.equal((await full.run(signed(event()))).status, 503);
  assert.deepEqual(full.errors, ["webhook_unmatched_backlog_full"]);
  const down = harness(new Response("", { status: 500 }));
  assert.equal((await down.run(signed(event()))).status, 503);
  assert.deepEqual(down.errors, ["webhook_storage_unavailable"]);
});

test("bad signatures, oversized and malformed bodies, and missing config never reach storage", async () => {
  const h = harness();
  const body = event();
  const tampered = signed(body);
  assert.equal((await h.run(new Request(tampered.url, { method: "POST", headers: tampered.headers, body: body.replace("4ef9", "5ef9") }))).status, 401);
  assert.equal((await h.run(signed(body, { at: now - 10 * 60_000 }))).status, 401);
  const huge = JSON.stringify({ type: "email.sent", pad: "x".repeat(70_000) });
  assert.equal((await h.run(signed(huge))).status, 413);
  const unlabelled = signed(huge);
  const streamed = new Request(unlabelled.url, { method: "POST", headers: unlabelled.headers, duplex: "half",
    body: new ReadableStream({ start(c) { c.enqueue(new TextEncoder().encode(huge)); c.close(); } }) });
  assert.equal((await h.run(streamed)).status, 413);
  assert.equal((await h.run(signed("not json"))).status, 400);
  assert.equal((await h.run(signed(event("email.sent", { email_id: "" })))).status, 400);
  assert.equal((await h.run(signed(event(), { id: "bad id!" }))).status, 400);
  assert.deepEqual(plain((await h.run(signed(event("email.opened")))).body), { ok: true, ignored: true });
  const domain = JSON.stringify({ type: "domain.updated", created_at: "2026-10-09T11:59:58.000Z", data: { id: "d_1" } });
  assert.equal((await h.run(signed(domain))).status, 200, "non-email events are ignored, not retried");
  assert.equal((await h.run(signed(event()), { secret: undefined })).status, 503);
  assert.equal((await h.run(signed(event()), { configuration: null })).status, 503);
  assert.equal(h.calls.length, 0);
});
