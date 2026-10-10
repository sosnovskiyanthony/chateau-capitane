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
  const context = { exports: {}, URL, TextDecoder, AbortController, Response, Buffer, setTimeout, clearTimeout,
    require: (name) => { assert.ok(Object.hasOwn(imports, name), `Unexpected dependency: ${name}`); return imports[name]; } };
  new Script(outputText).runInNewContext(context);
  return context.exports;
}
const persistence = load("src/lib/server/inquiries/persistence.ts", { "server-only": {} });
const abuse = load("src/lib/server/inquiries/abuse-limit.ts",
  { "server-only": {}, "node:crypto": crypto, "node:net": net, "./persistence": persistence });
const auth = load("src/lib/server/auth/staff-auth.ts", { "server-only": {}, "node:crypto": crypto,
  "../inquiries/abuse-limit": abuse, "../inquiries/persistence": persistence });
const configuration = { url: "https://example.supabase.co", secretKey: "sb_secret_test" };
const USER = "7f3c9a52-1b2d-4e5f-8a9b-0c1d2e3f4a5b";
const session = { access_token: "header.payload.sig", refresh_token: "r1", expires_in: 3600, token_type: "bearer" };

/** Fake Supabase: routes by path, records every call. */
function fake(routes) {
  const calls = [];
  const fetchImpl = async (url, init) => {
    const path = new URL(url).pathname + new URL(url).search;
    calls.push({ path, init, body: init.body ? JSON.parse(init.body) : undefined });
    const route = routes[path];
    if (!route) throw new Error(`unexpected ${path}`);
    if (route === "throw") throw new TypeError("network");
    const [status, body] = route;
    return new Response(body === undefined ? null : JSON.stringify(body), { status });
  };
  return { calls, fetch: fetchImpl };
}

test("return addresses stay inside /admin", () => {
  assert.equal(auth.safeAdminPath("/admin"), "/admin");
  assert.equal(auth.safeAdminPath("/admin/inbox"), "/admin/inbox");
  for (const bad of ["//evil.test", "https://evil.test/admin", "/admin/../contact", "/adminx", "/admin//evil.test",
    "/admin?x=1", "/contact", null, undefined, ["/admin"]]) {
    assert.equal(auth.safeAdminPath(bad), "/admin", String(bad));
  }
});

test("passwords are checked locally by byte length and confirmation", () => {
  assert.match(auth.passwordProblem("short", "short"), /at least 12/);
  assert.match(auth.passwordProblem("é".repeat(6), "é".repeat(6)), /at least 12/); // 12 bytes, 6 characters
  assert.match(auth.passwordProblem("é".repeat(37), "é".repeat(37)), /too long/); // 74 bytes
  assert.match(auth.passwordProblem("long enough pass", "long enough pasS"), /do not match/);
  assert.equal(auth.passwordProblem("long enough pass", "long enough pass"), null);
});

test("password sign-in maps Supabase answers without retrying", async () => {
  const ok = fake({ "/auth/v1/token?grant_type=password": [200, session] });
  const result = await auth.signInWithPassword(configuration, "a@b.test", "pw", ok.fetch);
  assert.deepEqual({ ...result, value: { ...result.value } },
    { kind: "ok", value: { accessToken: "header.payload.sig", refreshToken: "r1", expiresIn: 3600 } });
  assert.equal(ok.calls.length, 1);
  assert.equal(ok.calls[0].init.headers.apikey, "sb_secret_test");
  assert.equal(ok.calls[0].init.cache, "no-store");
  assert.deepEqual(ok.calls[0].body, { email: "a@b.test", password: "pw" });
  for (const [route, kind] of [[[400, { error_code: "invalid_credentials" }], "invalid"], [[429, {}], "unavailable"],
    [[500, {}], "unavailable"], ["throw", "unavailable"], [[200, { ...session, access_token: 5 }], "unavailable"],
    [[200, { ...session, expires_in: 10 }], "unavailable"], [[200, "not an object"], "unavailable"]]) {
    const f = fake({ "/auth/v1/token?grant_type=password": route });
    assert.equal((await auth.signInWithPassword(configuration, "a@b.test", "pw", f.fetch)).kind, kind);
  }
});

test("refresh, email links, password change and sign-out call the documented endpoints", async () => {
  const f = fake({
    "/auth/v1/token?grant_type=refresh_token": [200, session],
    "/auth/v1/verify": [200, session],
    "/auth/v1/user": [200, { id: USER }],
    "/auth/v1/logout?scope=local": [204],
  });
  assert.equal((await auth.refreshSession(configuration, "r0", f.fetch)).kind, "ok");
  assert.equal((await auth.verifyEmailLink(configuration, "invite", "abc123def456", f.fetch)).kind, "ok");
  assert.equal((await auth.updatePassword(configuration, "tok", "a new password", f.fetch)).kind, "ok");
  await auth.signOut(configuration, "tok", f.fetch);
  assert.deepEqual(f.calls.map((c) => [c.path, c.init.method, c.body]), [
    ["/auth/v1/token?grant_type=refresh_token", "POST", { refresh_token: "r0" }],
    ["/auth/v1/verify", "POST", { type: "invite", token_hash: "abc123def456" }],
    ["/auth/v1/user", "PUT", { password: "a new password" }],
    ["/auth/v1/logout?scope=local", "POST", undefined],
  ]);
  assert.equal(f.calls[2].init.headers.Authorization, "Bearer tok");
  assert.equal(f.calls[3].init.headers.Authorization, "Bearer tok");
  const used = fake({ "/auth/v1/verify": [403, { error_code: "otp_expired" }], "/auth/v1/user": [422, {}] });
  assert.equal((await auth.verifyEmailLink(configuration, "recovery", "abc123def456", used.fetch)).kind, "invalid");
  assert.equal((await auth.updatePassword(configuration, "tok", "weak", used.fetch)).kind, "invalid");
});

test("staff access comes only from the membership table, re-read on every check", async () => {
  // Metadata claiming ownership grants nothing.
  const claimed = { id: USER, email: "x@b.test", user_metadata: { role: "owner" }, app_metadata: { role: "owner" } };
  const cases = [
    [{ "/auth/v1/user": [200, claimed], "/rest/v1/rpc/staff_role": [200, null] }, "denied"],
    [{ "/auth/v1/user": [200, claimed], "/rest/v1/rpc/staff_role": [200, "staff"] }, "ok"],
    [{ "/auth/v1/user": [200, claimed], "/rest/v1/rpc/staff_role": [200, "admin"] }, "unavailable"],
    [{ "/auth/v1/user": [200, claimed], "/rest/v1/rpc/staff_role": [500, {}] }, "unavailable"],
    // Signed out elsewhere / session deleted / expired token: Supabase refuses the token.
    [{ "/auth/v1/user": [403, { error_code: "session_not_found" }] }, "invalid"],
    [{ "/auth/v1/user": [401, {}] }, "invalid"],
    [{ "/auth/v1/user": [200, { id: "not-a-uuid" }] }, "unavailable"],
    [{ "/auth/v1/user": "throw" }, "unavailable"],
  ];
  for (const [routes, kind] of cases) {
    const f = fake(routes);
    const result = await auth.resolveStaff(configuration, "tok", f.fetch);
    assert.equal(result.kind, kind, JSON.stringify(routes));
    if (kind === "ok") assert.deepEqual({ ...result.value }, { userId: USER, email: "x@b.test", role: "staff" });
    const rpc = f.calls.find((c) => c.path === "/rest/v1/rpc/staff_role");
    if (rpc) assert.deepEqual(rpc.body, { p_user: USER });
  }
});

test("sign-in limit hashes the network and fails closed", async () => {
  const headers = new Headers({ "x-vercel-forwarded-for": "203.0.113.7" });
  const f = fake({ "/rest/v1/rpc/check_login_limit": [200, { allowed: false, retryAfter: 120 }] });
  const result = await auth.checkLoginLimit({ headers }, configuration, { env: { VERCEL: "1" }, fetch: f.fetch });
  assert.deepEqual({ ...result }, { kind: "limited", retryAfter: 120 });
  const expected = crypto.createHmac("sha256", "sb_secret_test").update("login-limit:203.0.113.7").digest("hex");
  assert.deepEqual(f.calls[0].body, { p_subject: expected, p_limit: auth.LOGIN_LIMIT.limit, p_seconds: auth.LOGIN_LIMIT.seconds });
  assert.ok(!JSON.stringify(f.calls[0].body).includes("203.0.113.7"));
  for (const route of ["throw", [500, {}], [200, { allowed: false, retryAfter: 0 }], [200, null]]) {
    const failing = fake({ "/rest/v1/rpc/check_login_limit": route });
    assert.equal((await auth.checkLoginLimit({ headers }, configuration, { env: {}, fetch: failing.fetch })).kind, "unavailable");
  }
});
