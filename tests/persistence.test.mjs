import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";
import { Script } from "node:vm";
import ts from "typescript";

const { outputText } = ts.transpileModule(readFileSync("src/lib/server/inquiries/persistence.ts", "utf8"), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
});
const context = { exports: {}, URL, TextDecoder, AbortController,
  setTimeout: (callback, delay) => setTimeout(callback, Math.min(delay, 25)), clearTimeout,
  require: (name) => { assert.equal(name, "server-only"); return {}; } };
new Script(outputText).runInNewContext(context);
const { getPersistenceConfiguration, recordContactInquiry } = context.exports;
const configuration = { url: "https://example.supabase.co", secretKey: "sb_secret_test" };
const inquiry = { name: "Synthetic Guest", email: "guest@example.invalid", phone: "", date: "", guests: "", message: "Synthetic request" };
const key = "12345678-1234-4123-8123-123456789abc";
const settings = { from: "Website <sender@example.invalid>", to: "staff@example.invalid" };

test("configuration rejects browser keys, insecure remote URLs and embedded credentials", () => {
  for (const env of [{}, { SUPABASE_URL: configuration.url, SUPABASE_SECRET_KEY: "sb_publishable_test" },
    { SUPABASE_URL: "http://remote.invalid", SUPABASE_SECRET_KEY: configuration.secretKey },
    { SUPABASE_URL: "https://user:pass@example.invalid", SUPABASE_SECRET_KEY: configuration.secretKey },
    { SUPABASE_URL: "https://example.invalid/path", SUPABASE_SECRET_KEY: configuration.secretKey }]) {
    assert.equal(getPersistenceConfiguration(env), null);
  }
  assert.equal(getPersistenceConfiguration({ SUPABASE_URL: configuration.url, SUPABASE_SECRET_KEY: configuration.secretKey }).url, configuration.url);
});

test("caller sends one no-store RPC, canonical key and immutable server notification", async () => {
  let calls = 0;
  const result = await recordContactInquiry(inquiry, key.toUpperCase(), settings, { configuration, fetch: async (url, options) => {
    calls++;
    assert.equal(url, `${configuration.url}/rest/v1/rpc/record_contact_inquiry`);
    assert.equal(options.cache, "no-store");
    assert.equal(options.headers.apikey, configuration.secretKey);
    const body = JSON.parse(options.body);
    assert.equal(body.p_key, key);
    assert.deepEqual(body.p_inquiry, inquiry);
    assert.equal(body.p_notification.recipient, settings.to);
    assert.equal(body.p_notification.reply_to, inquiry.email);
    return Response.json({ kind: "recorded", inquiryId: key });
  } });
  assert.equal(result.kind, "recorded");
  assert.equal(result.inquiryId, key);
  assert.equal(calls, 1);
});

test("lost acknowledgment, provider errors and malformed/oversized acknowledgments fail safely without retries", async () => {
  for (const response of [() => { throw new Error("sensitive provider detail"); },
    () => new Response("sensitive", { status: 500 }), () => Response.json({ kind: "recorded", inquiryId: "bad" }),
    () => new Response("x".repeat(2049)), () => new Response("not json")]) {
    let calls = 0;
    const result = await recordContactInquiry(inquiry, key, settings, { configuration, fetch: async () => { calls++; return response(); } });
    assert.equal(result.kind, "unavailable");
    assert.equal(Object.keys(result).length, 1);
    assert.equal(calls, 1);
  }
});

test("conflicts are distinct; missing config, malformed keys and invalid delivery settings never call storage", async () => {
  const conflict = await recordContactInquiry(inquiry, key, settings, { configuration, fetch: async () => Response.json({ kind: "conflict" }) });
  assert.equal(conflict.kind, "conflict");
  for (const [config, submissionKey, delivery] of [[null, key, settings], [configuration, "bad", settings],
    [configuration, key, { ...settings, to: "bad" }], [configuration, key, { ...settings, from: "bad" }],
    [configuration, key, { ...settings, from: "bad\nheader" }]]) {
    const result = await recordContactInquiry(inquiry, submissionKey, delivery, { configuration: config, fetch: async () => assert.fail("storage invoked") });
    assert.equal(result.kind, "unavailable");
  }
});

test("stalled RPC aborts and returns uncertainty without automatically resubmitting", async () => {
  let calls = 0;
  const result = await recordContactInquiry(inquiry, key, settings, { configuration, fetch: async (_url, options) => {
    calls++;
    return new Promise((_resolve, reject) => options.signal.addEventListener("abort", () => reject(new Error("aborted")), { once: true }));
  } });
  assert.equal(result.kind, "unavailable");
  assert.equal(calls, 1);
});
