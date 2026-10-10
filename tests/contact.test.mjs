import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";
import { Script } from "node:vm";
import ts from "typescript";

// Use the project's installed compiler; the production build checks types separately.
function loadSource(path, imports = {}, globals = {}) {
  const { outputText } = ts.transpileModule(readFileSync(path, "utf8"), {
    fileName: path,
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  });
  const context = {
    exports: {}, Request, Response, TextDecoder, AbortController, setTimeout, clearTimeout,
    require: (name) => {
      assert.ok(Object.hasOwn(imports, name), `Unexpected dependency: ${name}`);
      return imports[name];
    },
    ...globals,
  };
  new Script(outputText, { filename: path }).runInNewContext(context);
  return context.exports;
}

const privateEvents = loadSource("src/lib/data/private-events.ts");
const contactInput = loadSource("src/lib/server/inquiries/contact-input.ts", { "@/lib/data/private-events": privateEvents });
const handler = loadSource("src/lib/server/contact.ts", { "./inquiries/contact-input": contactInput });
const valid = { name: " Guest ", email: " guest@example.test ", message: " Dinner inquiry " };

function request(body = valid, headers = {}) {
  return new Request("https://restaurant.test/api/contact", {
    method: "POST",
    headers: { "Content-Type": "application/json", ...headers },
    body: typeof body === "string" ? body : JSON.stringify(body),
  });
}

const persistence = { url: "https://example.supabase.co", secretKey: "sb_secret_test" };

function fixture(overrides = {}) {
  const calls = [];
  const logs = [];
  const limits = [];
  const dependencies = {
    getConfiguration: () => ({ persistence, from: "sender@example.test", to: "owner@example.test" }),
    limit: async (...args) => { limits.push(args); return { kind: "allowed" }; },
    record: async (...args) => { calls.push(args); return { kind: "recorded", inquiryId: "internal-id" }; },
    logError: (...args) => logs.push(args),
    ...overrides,
  };
  return { calls, logs, limits, submit: (req = request()) => handler.handleContact(req, dependencies) };
}

test("normalized inquiry excludes guest-supplied routing and workflow fields", async () => {
  const result = await contactInput.parseContactInput(request({
    ...valid, name: "  Guest\n Name ", company: " ",
    to: "attacker@example.test", status: "resolved", role: "owner",
  }, { "Idempotency-Key": "12345678-1234-4123-8123-123456789abc" }));
  assert.deepEqual(JSON.parse(JSON.stringify(result)), {
    kind: "valid",
    inquiry: {
      name: "Guest Name", email: "guest@example.test", message: "Dinner inquiry",
      phone: "", date: "", guests: "", kind: "contact", eventPackage: "",
    },
    submissionKey: "12345678-1234-4123-8123-123456789abc",
  });
});

test("event inquiries snapshot the published package label; unknown packages are rejected", async () => {
  const parse = async (event) => (await contactInput.parseContactInput(request({ ...valid, event, date: "2026-12-31", guests: "40" }))).inquiry;
  const tier = privateEvents.getPrivateEventTiers().find((t) => t.id === "banquet-140");
  assert.deepEqual([(await parse("banquet-140")).kind, (await parse("banquet-140")).eventPackage],
    ["event", `${tier.name}, $${tier.pricePerPerson} per person`]);
  assert.equal((await parse(" banquet-140 ")).eventPackage, "Banquet, $140 per person");
  assert.deepEqual([(await parse("undecided")).kind, (await parse("undecided")).eventPackage], ["event", ""]);
  assert.equal((await parse("undecided")).date, "2026-12-31");
  assert.deepEqual([(await parse("")).kind, (await parse("")).eventPackage], ["contact", ""]);
  for (const event of ["banquet-999", "Banquet, $140 per person", "constructor", "__proto__"]) {
    const result = await contactInput.parseContactInput(request({ ...valid, event }));
    assert.equal(result.kind, "invalid");
    assert.equal(result.status, 400);
  }
  assert.equal((await contactInput.parseContactInput(request({ ...valid, event: ["kids"] }))).kind, "invalid");
});

test("discarded and invalid submissions never expose an inquiry to persistence", async () => {
  for (const [body, kind] of [[{ company: "bot", role: "owner" }, "discard"], [{ ...valid, guests: "0" }, "invalid"]]) {
    const result = await contactInput.parseContactInput(request(body));
    assert.equal(result.kind, kind);
    assert.equal(Object.hasOwn(result, "inquiry"), false);
    assert.equal(Object.hasOwn(result, "submissionKey"), false);
  }
});

test("an unchanged retry after unavailable storage reuses the same key", async () => {
  const keys = [];
  let first = true;
  const { submit } = fixture({ record: async (_inquiry, key) => {
    keys.push(key);
    if (first) { first = false; return { kind: "unavailable" }; }
    return { kind: "recorded", inquiryId: "internal-id" };
  } });
  const headers = { "Idempotency-Key": "12345678-1234-4123-8123-123456789abc" };
  const failed = await submit(request(valid, headers));
  assert.equal(failed.status, 503);
  assert.ok((await failed.json()).error.includes("call"));
  const ok = await submit(request(valid, headers));
  assert.equal(ok.status, 202);
  assert.deepEqual(await ok.json(), { ok: true });
  assert.deepEqual(keys, [headers["Idempotency-Key"], headers["Idempotency-Key"]]);
});

for (const key of ["", "arbitrary-key", "x".repeat(257), "12345678-1234-4123-7123-123456789abc"]) {
  test(`rejects an invalid submission key (${key.length} characters) before storage`, async () => {
    const { submit, calls } = fixture();
    assert.equal((await submit(request(valid, { "Idempotency-Key": key }))).status, 400);
    assert.equal(calls.length, 0);
  });
}

test("keyless legacy clients are still recorded, without deduplication", async () => {
  const { submit, calls } = fixture();
  assert.equal((await submit()).status, 202);
  assert.equal(calls[0][1], null);
});

test("records one normalized inquiry with server-controlled notification settings", async () => {
  const { submit, calls } = fixture();
  const response = await submit(request({ ...valid, name: "  Guest\n Name ", phone: "+1 555 0100", date: "2028-02-29", guests: "12", to: "attacker@example.test" }));
  assert.equal(response.status, 202);
  assert.deepEqual(await response.json(), { ok: true });
  assert.equal(response.headers.get("cache-control"), "no-store");
  assert.equal(calls.length, 1);
  const [inquiry, key, settings, options] = calls[0];
  assert.deepEqual({ ...inquiry }, {
    name: "Guest Name", email: "guest@example.test", message: "Dinner inquiry",
    phone: "+1 555 0100", date: "2028-02-29", guests: "12", kind: "contact", eventPackage: "",
  });
  assert.equal(key, null);
  assert.deepEqual({ ...settings }, { from: "sender@example.test", to: "owner@example.test" });
  assert.equal(options.configuration, persistence);
});

for (const [label, body] of [
  ["malformed JSON", "{"], ["array body", []], ["null body", null],
  ["blank name", { ...valid, name: " " }], ["missing message", { name: "Guest", email: "guest@example.test" }],
  ["invalid email", { ...valid, email: "not-an-email" }], ["oversized message", { ...valid, message: "x".repeat(5001) }],
  ["wrong optional field type", { ...valid, phone: 123 }], ["wrong honeypot type", { ...valid, company: [] }],
  ["non-leap February 29", { ...valid, date: "2027-02-29" }], ["February 30", { ...valid, date: "2028-02-30" }],
  ["invalid month", { ...valid, date: "2028-13-01" }], ["zero guests", { ...valid, guests: "0" }],
  ["fractional guests", { ...valid, guests: "1.5" }], ["negative guests", { ...valid, guests: "-1" }],
  ["too many digits", { ...valid, guests: "10000" }], ["multiline phone", { ...valid, phone: "555\nEmail: other@example.test" }],
]) {
  test(`rejects ${label} without storage`, async () => {
    const { submit, calls } = fixture({ getConfiguration: () => { throw new Error("Invalid input must not reach storage configuration"); } });
    const response = await submit(request(body));
    assert.equal(response.status, 400);
    assert.equal(calls.length, 0);
  });
}

test("discards honeypot submissions with the success reply, without configuration", async () => {
  const { submit, calls, limits } = fixture({ getConfiguration: () => { throw new Error("Must not read configuration"); } });
  assert.equal((await submit(request({ company: "bot" }))).status, 202);
  assert.equal(calls.length, 0);
  assert.equal(limits.length, 0);
});

test("checks the shared limit with the request and key before storage", async () => {
  const { submit, limits, calls } = fixture();
  const req = request(valid, { "Idempotency-Key": "12345678-1234-4123-8123-123456789abc" });
  assert.equal((await submit(req)).status, 202);
  assert.deepEqual(limits, [[req, "12345678-1234-4123-8123-123456789abc", persistence]]);
  assert.equal(calls.length, 1);
});

test("a limited client gets 429 with Retry-After and a phone fallback, and nothing is stored", async () => {
  const { submit, calls, logs } = fixture({ limit: async () => ({ kind: "limited", retryAfter: 120 }) });
  const response = await submit();
  assert.equal(response.status, 429);
  assert.equal(response.headers.get("retry-after"), "120");
  assert.equal(response.headers.get("cache-control"), "no-store");
  assert.ok((await response.json()).error.includes("call"));
  assert.equal(calls.length, 0);
  assert.deepEqual(logs, [["contact_rate_limited"]]);
});

test("a limiter outage fails closed with a phone fallback, never unlimited acceptance", async () => {
  const { submit, calls, logs } = fixture({ limit: async () => ({ kind: "unavailable" }) });
  const response = await submit();
  assert.equal(response.status, 503);
  assert.ok((await response.json()).error.includes("call"));
  assert.equal(calls.length, 0);
  assert.deepEqual(logs, [["contact_limiter_unavailable"]]);
});

test("an event inquiry while published content is unreadable gets 503 with a phone fallback", async () => {
  const { submit, calls, logs } = fixture({ packages: async () => { throw new Error("content_unavailable"); } });
  const response = await submit(request({ ...valid, event: "banquet-140" }));
  assert.equal(response.status, 503);
  assert.ok((await response.json()).error.includes("call"));
  assert.equal(calls.length, 0);
  assert.deepEqual(logs, [["contact_content_unavailable"]]);
});

test("requires JSON content type", async () => {
  const { submit, calls } = fixture();
  assert.equal((await submit(request(valid, { "Content-Type": "text/plain" }))).status, 415);
  assert.equal(calls.length, 0);
});

test("counts streamed bytes when Content-Length is absent or understated", async () => {
  const { submit, calls } = fixture();
  const large = JSON.stringify({ ...valid, ignored: "x".repeat(33_000) });
  assert.equal((await submit(request(large))).status, 413);
  assert.equal((await submit(request(large, { "Content-Length": "1" }))).status, 413);
  assert.equal(calls.length, 0);
});

test("rejects a declared oversized request before storage", async () => {
  const { submit, calls } = fixture();
  assert.equal((await submit(request(valid, { "Content-Length": "40000" }))).status, 413);
  assert.equal(calls.length, 0);
});

test("allows maximum supported fields and optional blanks", async () => {
  const { submit } = fixture();
  assert.equal((await submit(request({ ...valid, name: "n".repeat(200), message: "m".repeat(5000), guests: "9999", date: "", phone: "" }))).status, 202);
});

for (const configuration of [{ persistence: null, from: "sender@example.test", to: "owner@example.test" },
  { persistence, to: "owner@example.test" }, { persistence, from: "sender@example.test", to: " " }]) {
  test(`missing configuration returns unavailable without storage (${JSON.stringify(Object.keys(configuration))})`, async () => {
    const { submit, calls, logs } = fixture({ getConfiguration: () => configuration });
    const response = await submit();
    assert.equal(response.status, 503);
    assert.equal(calls.length, 0);
    assert.deepEqual(logs, [["contact_not_configured"]]);
    assert.ok(!(await response.text()).includes("sb_secret"));
  });
}

test("a changed payload under a reserved key is a conflict, not success", async () => {
  const { submit, logs } = fixture({ record: async () => ({ kind: "conflict" }) });
  const response = await submit(request(valid, { "Idempotency-Key": "12345678-1234-4123-8123-123456789abc" }));
  assert.equal(response.status, 409);
  assert.deepEqual(logs, [["contact_key_conflict"]]);
});

test("unavailable storage is never acknowledged and exposes no internals", async () => {
  const { submit, logs } = fixture({ record: async () => ({ kind: "unavailable" }) });
  const response = await submit();
  assert.equal(response.status, 503);
  const body = await response.json();
  assert.equal(body.ok, undefined);
  assert.deepEqual(logs, [["contact_storage_unavailable"]]);
});

test("the Next route uses current server environment and the site recipient fallback", async () => {
  const calls = [];
  const env = { CONTACT_FROM_EMAIL: "sender@example.test" };
  const route = loadSource("src/app/api/contact/route.ts", {
    "@/lib/server/contact": handler,
    "@/lib/data/site": { site: { email: "fallback@example.test" } },
    "@/lib/server/inquiries/abuse-limit": { checkContactLimit: async () => ({ kind: "allowed" }) },
    "@/lib/server/ops": { requestLogger: () => () => {} },
    "@/lib/server/inquiries/persistence": {
      getPersistenceConfiguration: () => persistence,
      recordContactInquiry: async (inquiry, _key, settings) => { calls.push({ ...settings, inquiry }); return { kind: "recorded", inquiryId: "id" }; },
    },
    // Published content: the $140 banquet repriced to $145 and the kids package withdrawn.
    "@/lib/server/content/content": { getSiteContent: async () => ({ packages: privateEvents.getPrivateEventTiers()
      .filter((tier) => tier.id !== "kids").map((tier) => tier.id === "banquet-140" ? { ...tier, pricePerPerson: 145 } : tier) }) },
  }, { process: { env }, console: { error: () => {} } });
  assert.equal((await route.POST(request())).status, 202);
  env.CONTACT_TO_EMAIL = "new-owner@example.test";
  assert.equal((await route.POST(request())).status, 202);
  assert.equal(calls[0].to, "fallback@example.test");
  assert.equal(calls[1].to, "new-owner@example.test");
  // Event inquiries snapshot the published package, not the built-in one.
  assert.equal((await route.POST(request({ ...valid, event: "banquet-140" }))).status, 202);
  assert.equal(calls[2].inquiry.eventPackage, "Banquet, $145 per person");
  assert.equal((await route.POST(request({ ...valid, event: "kids" }))).status, 400);
});

test("vercel.json schedules the notification worker every minute", () => {
  assert.deepEqual(JSON.parse(readFileSync("vercel.json", "utf8")).crons,
    [{ path: "/api/cron/notifications", schedule: "* * * * *" }]);
});
