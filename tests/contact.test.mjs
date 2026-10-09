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

const contactInput = loadSource("src/lib/server/inquiries/contact-input.ts");
const handler = loadSource("src/lib/server/contact.ts", { "./inquiries/contact-input": contactInput });
const valid = { name: " Guest ", email: " guest@example.test ", message: " Dinner inquiry " };

function request(body = valid, headers = {}) {
  return new Request("https://restaurant.test/api/contact", {
    method: "POST",
    headers: { "Content-Type": "application/json", ...headers },
    body: typeof body === "string" ? body : JSON.stringify(body),
  });
}

function fixture(overrides = {}) {
  const calls = [];
  const logs = [];
  const dependencies = {
    getConfiguration: () => ({ apiKey: "test-key", from: "sender@example.test", to: "owner@example.test" }),
    fetch: async (...args) => { calls.push(args); return Response.json({ id: "email-123" }); },
    logError: (...args) => logs.push(args),
    ...overrides,
  };
  return { calls, logs, submit: (req = request()) => handler.handleContact(req, dependencies) };
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
      phone: "", date: "", guests: "",
    },
    submissionKey: "12345678-1234-4123-8123-123456789abc",
  });
});

test("discarded and invalid submissions never expose an inquiry to persistence", async () => {
  for (const [body, kind] of [[{ company: "bot", role: "owner" }, "discard"], [{ ...valid, guests: "0" }, "invalid"]]) {
    const result = await contactInput.parseContactInput(request(body));
    assert.equal(result.kind, kind);
    assert.equal(Object.hasOwn(result, "inquiry"), false);
    assert.equal(Object.hasOwn(result, "submissionKey"), false);
  }
});

test("retry after an accepted email with a lost response produces one mocked delivery", async () => {
  const accepted = new Map();
  let delivered = 0;
  const { submit } = fixture({ fetch: async (_url, options) => {
    const key = options.headers["Idempotency-Key"];
    assert.equal(key, "contact/12345678-1234-4123-8123-123456789abc");
    if (!accepted.has(key)) {
      accepted.set(key, options.body);
      delivered++;
      throw new Error("Provider accepted the email but the connection failed");
    }
    assert.equal(accepted.get(key), options.body);
    return Response.json({ id: "email-once" });
  } });
  const headers = { "Idempotency-Key": "12345678-1234-4123-8123-123456789abc" };
  assert.equal((await submit(request(valid, headers))).status, 502);
  assert.equal((await submit(request(valid, headers))).status, 200);
  assert.equal(delivered, 1);
});

for (const key of ["", "arbitrary-key", "x".repeat(257), "12345678-1234-4123-7123-123456789abc"]) {
  test(`rejects an invalid submission key (${key.length} characters) before delivery`, async () => {
    const { submit, calls } = fixture();
    assert.equal((await submit(request(valid, { "Idempotency-Key": key }))).status, 400);
    assert.equal(calls.length, 0);
  });
}

test("legacy clients without a submission key still send without a provider key", async () => {
  const { submit, calls } = fixture();
  assert.equal((await submit()).status, 200);
  assert.equal(Object.hasOwn(calls[0][1].headers, "Idempotency-Key"), false);
});

test("sends one normalized plain-text email to the configured recipient", async () => {
  const { submit, calls } = fixture();
  const response = await submit(request({ ...valid, name: "  Guest\n Name ", phone: "+1 555 0100", date: "2028-02-29", guests: "12", to: "attacker@example.test" }));
  assert.equal(response.status, 200);
  assert.deepEqual(await response.json(), { ok: true });
  assert.equal(response.headers.get("cache-control"), "no-store");
  assert.equal(calls.length, 1);
  const [url, options] = calls[0];
  assert.equal(url, "https://api.resend.com/emails");
  assert.equal(options.headers.Authorization, "Bearer test-key");
  assert.deepEqual(JSON.parse(options.body), {
    from: "sender@example.test", to: "owner@example.test", reply_to: "guest@example.test",
    subject: "Enquiry from Guest Name",
    text: "Name: Guest Name\nEmail: guest@example.test\nPhone: +1 555 0100\nDate: 2028-02-29\nGuests: 12\n\nDinner inquiry",
  });
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
  test(`rejects ${label} without delivery`, async () => {
    const { submit, calls } = fixture({ getConfiguration: () => { throw new Error("Invalid input must not reach delivery configuration"); } });
    const response = await submit(request(body));
    assert.equal(response.status, 400);
    assert.equal(calls.length, 0);
  });
}

test("discards honeypot submissions even without email configuration", async () => {
  const { submit, calls } = fixture({ getConfiguration: () => { throw new Error("Must not read configuration"); } });
  assert.equal((await submit(request({ company: "bot" }))).status, 200);
  assert.equal(calls.length, 0);
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

test("rejects a declared oversized request before delivery", async () => {
  const { submit, calls } = fixture();
  assert.equal((await submit(request(valid, { "Content-Length": "40000" }))).status, 413);
  assert.equal(calls.length, 0);
});

test("allows maximum supported fields and optional blanks", async () => {
  const { submit } = fixture();
  assert.equal((await submit(request({ ...valid, name: "n".repeat(200), message: "m".repeat(5000), guests: "9999", date: "", phone: "" }))).status, 200);
});

test("missing configuration returns unavailable without exposing settings", async () => {
  const { submit, calls, logs } = fixture({ getConfiguration: () => ({ to: "owner@example.test" }) });
  const response = await submit();
  assert.equal(response.status, 503);
  assert.equal(calls.length, 0);
  assert.deepEqual(logs, [["contact_not_configured"]]);
});

for (const status of [401, 422, 429, 500]) {
  test(`provider ${status} produces a safe failure`, async () => {
    const { submit, logs } = fixture({ fetch: async () => new Response("private provider diagnostics test-key", { status }) });
    const response = await submit();
    assert.equal(response.status, 502);
    assert.deepEqual(logs, [["contact_provider_rejected", status]]);
    assert.ok(!(await response.text()).includes("test-key"));
  });
}

for (const acknowledgment of [{}, { id: "" }, { id: 123 }, null]) {
  test(`does not report success for acknowledgment ${JSON.stringify(acknowledgment)}`, async () => {
    const { submit } = fixture({ fetch: async () => Response.json(acknowledgment) });
    assert.equal((await submit()).status, 502);
  });
}

test("handles malformed provider JSON and network failures", async () => {
  for (const fetch of [async () => new Response("not-json"), async () => { throw new Error("private network error"); }]) {
    const { submit, logs } = fixture({ fetch });
    assert.equal((await submit()).status, 502);
    assert.deepEqual(logs, [["contact_provider_unavailable"]]);
  }
});

test("aborts a stalled provider request and avoids automatic retries", async () => {
  let attempts = 0;
  const { submit, logs } = fixture({
    timeoutMs: 10,
    fetch: (_url, { signal }) => new Promise((_resolve, reject) => {
      attempts++;
      signal.addEventListener("abort", () => reject(new Error("aborted")), { once: true });
    }),
  });
  assert.equal((await submit()).status, 504);
  assert.equal(attempts, 1);
  assert.deepEqual(logs, [["contact_provider_timeout"]]);
});

test("the Next route uses current server environment and the site recipient fallback", async () => {
  const calls = [];
  const env = { RESEND_API_KEY: "test-key", CONTACT_FROM_EMAIL: "sender@example.test" };
  const route = loadSource("src/app/api/contact/route.ts", {
    "@/lib/server/contact": handler,
    "@/lib/data/site": { site: { email: "fallback@example.test" } },
  }, {
    process: { env }, console: { error: () => {} },
    fetch: async (_url, options) => { calls.push(JSON.parse(options.body)); return Response.json({ id: "email-123" }); },
  });
  assert.equal((await route.POST(request())).status, 200);
  env.CONTACT_TO_EMAIL = "new-owner@example.test";
  assert.equal((await route.POST(request())).status, 200);
  assert.equal(calls[0].to, "fallback@example.test");
  assert.equal(calls[1].to, "new-owner@example.test");
});
