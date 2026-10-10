import assert from "node:assert/strict";
import crypto from "node:crypto";
import { readFileSync } from "node:fs";
import net from "node:net";
import { test } from "node:test";
import { Script } from "node:vm";
import ts from "typescript";

function load(path, imports) {
  const { outputText } = ts.transpileModule(readFileSync(path, "utf8"), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  });
  const context = { exports: {}, URL, TextDecoder, AbortController, Response, setTimeout, clearTimeout,
    require: (name) => { assert.ok(Object.hasOwn(imports, name), `Unexpected dependency: ${name}`); return imports[name]; } };
  new Script(outputText).runInNewContext(context);
  return context.exports;
}
const persistence = load("src/lib/server/inquiries/persistence.ts", { "server-only": {} });
const { clientNetwork, checkContactLimit, CONTACT_LIMITS } = load("src/lib/server/inquiries/abuse-limit.ts",
  { "server-only": {}, "node:crypto": crypto, "node:net": net, "./persistence": persistence });
const configuration = { url: "https://example.supabase.co", secretKey: "sb_secret_test" };
const vercel = { VERCEL: "1" };
const request = (headers = {}) => new Request("https://restaurant.test/api/contact", { method: "POST", headers });

test("only Vercel's own header identifies the client; forged forwarding headers are ignored", () => {
  const forged = { "x-forwarded-for": "198.51.100.9", "x-real-ip": "198.51.100.9", "forwarded": "for=198.51.100.9" };
  assert.equal(clientNetwork(request({ ...forged, "x-vercel-forwarded-for": "203.0.113.7" }), vercel), "203.0.113.7");
  assert.equal(clientNetwork(request(forged), vercel), "unattributed");
  // Off Vercel nothing is trusted, even Vercel's header name.
  assert.equal(clientNetwork(request({ "x-vercel-forwarded-for": "203.0.113.7" }), {}), "unattributed");
  assert.equal(clientNetwork(request({ "x-vercel-forwarded-for": "not an ip" }), vercel), "unattributed");
});

test("IPv6 clients share one bucket per /64; mapped IPv4 is treated as IPv4", () => {
  const net6 = (ip) => clientNetwork(request({ "x-vercel-forwarded-for": ip }), vercel);
  assert.equal(net6("2001:db8:a:b:1:2:3:4"), "2001:0db8:000a:000b::/64");
  assert.equal(net6("2001:DB8:A:B::9"), "2001:0db8:000a:000b::/64");
  assert.equal(net6("2001:db8::1"), "2001:0db8:0000:0000::/64");
  assert.equal(net6("::ffff:203.0.113.7"), "203.0.113.7");
  assert.equal(net6("::ffff:cb00:7107"), "203.0.113.7");
  assert.equal(net6("0:0:0:0:0:FFFF:CB00:7107"), "203.0.113.7");
  assert.equal(net6("2001:db8:a:b::1.2.3.4"), "2001:0db8:000a:000b::/64");
});

function rpc(reply) {
  const calls = [];
  const fetch = async (url, init) => { calls.push({ url, args: JSON.parse(init.body) }); return reply(); };
  return { calls, check: (req, key = null) => checkContactLimit(req, key, configuration, { env: vercel, fetch }) };
}

test("sends a keyed hash of the network, never the address, with the documented thresholds", async () => {
  const { calls, check } = rpc(() => Response.json({ allowed: true }));
  assert.deepEqual({ ...await check(request({ "x-vercel-forwarded-for": "203.0.113.7", "x-forwarded-for": "1.1.1.1" }),
    "12345678-1234-4123-8123-ABCDEF123456") }, { kind: "allowed" });
  await check(request({ "x-vercel-forwarded-for": "203.0.113.7", "x-forwarded-for": "9.9.9.9" }));
  assert.equal(calls[0].url, "https://example.supabase.co/rest/v1/rpc/check_contact_limit");
  assert.match(calls[0].args.p_subject, /^[0-9a-f]{64}$/);
  assert.equal(calls[1].args.p_subject, calls[0].args.p_subject);
  assert.ok(!JSON.stringify(calls).includes("203.0.113.7"));
  assert.equal(calls[0].args.p_key, "12345678-1234-4123-8123-abcdef123456");
  assert.deepEqual([calls[0].args.p_subject_limit, calls[0].args.p_subject_seconds, calls[0].args.p_global_limit,
    calls[0].args.p_global_seconds], [CONTACT_LIMITS.subjectLimit, CONTACT_LIMITS.subjectSeconds,
    CONTACT_LIMITS.globalLimit, CONTACT_LIMITS.globalSeconds]);
});

test("limited replies carry retry guidance; anything unexpected fails closed", async () => {
  assert.deepEqual({ ...await rpc(() => Response.json({ allowed: false, retryAfter: 42 })).check(request()) },
    { kind: "limited", retryAfter: 42 });
  for (const reply of [() => Response.json({ allowed: false }), () => Response.json({ allowed: false, retryAfter: 0 }),
    () => Response.json({ allowed: "yes" }), () => new Response("", { status: 500 }), () => { throw new Error("down"); }]) {
    assert.deepEqual({ ...await rpc(reply).check(request()) }, { kind: "unavailable" });
  }
});
