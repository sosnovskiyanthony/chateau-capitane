import assert from "node:assert/strict";
import { readFileSync, mkdirSync, mkdtempSync } from "node:fs";
import { resolve, join } from "node:path";
import { randomUUID, randomBytes } from "node:crypto";
import { createServer } from "node:net";
import { test } from "node:test";
import EmbeddedPostgres from "embedded-postgres";

// No DATABASE_URL is consumed: this suite cannot reset a remote or existing database.
const fixtureRoot = resolve(".local-db-tests");
mkdirSync(fixtureRoot, { recursive: true });
const databaseDir = mkdtempSync(join(fixtureRoot, "run-"));
const port = await new Promise((resolvePort, reject) => {
  const server = createServer();
  server.on("error", reject);
  server.listen(0, "127.0.0.1", () => {
    const value = server.address().port;
    server.close(() => resolvePort(value));
  });
});
const cluster = new EmbeddedPostgres({ databaseDir, port, user: "postgres",
  password: randomBytes(24).toString("hex"), persistent: true, authMethod: "scram-sha-256",
  postgresFlags: ["-h", "127.0.0.1"], onLog: () => {}, onError: () => {} });
const migration = readFileSync("supabase/migrations/202610090001_inquiry_foundation.sql", "utf8");
const inquiry = { name: "Synthetic Guest", email: "guest@example.invalid", phone: "", date: "2026-12-15", guests: "8", message: "Synthetic request" };
const notification = { sender: "Website <sender@example.invalid>", recipient: "staff@example.invalid",
  reply_to: inquiry.email, subject: "Synthetic inquiry", body: "Synthetic notification" };

async function connect(database = "inquiry_test") {
  const client = cluster.getPgClient(database, "127.0.0.1");
  await client.connect();
  return client;
}
async function record(key = randomUUID(), input = inquiry, payload = notification) {
  const client = await connect();
  try {
    await client.query("set role service_role");
    const result = await client.query("select public.record_contact_inquiry($1::jsonb,$2::uuid,$3::jsonb) result", [input, key, payload]);
    return result.rows[0].result;
  } finally { await client.end(); }
}
async function counts(client) {
  const result = await client.query(`select
    (select count(*)::int from inquiry_private.inquiries) inquiries,
    (select count(*)::int from inquiry_private.submission_keys) keys,
    (select count(*)::int from inquiry_private.notification_jobs) jobs`);
  return result.rows[0];
}
async function rejectsSql(client, sql, values, code) {
  await assert.rejects(client.query(sql, values), (error) => error.code === code);
}

test("real PostgreSQL persistence foundation", { timeout: 120_000 }, async (t) => {
  let admin;
  try {
    await cluster.initialise();
    await cluster.start();
    const root = await connect("postgres");
    try {
      await root.query("create role anon nologin; create role authenticated nologin; create role service_role nologin bypassrls;");
    } finally { await root.end(); }
    await cluster.createDatabase("inquiry_test");
    admin = await connect();
    await admin.query(migration);

    await t.test("empty migrations rebuild and synthetic seed repeats without duplication", async () => {
      await cluster.createDatabase("rebuild_test");
      const rebuilt = await connect("rebuild_test");
      try {
        await rebuilt.query(migration);
        const seed = readFileSync("supabase/seed.sql", "utf8");
        await rebuilt.query(seed);
        await rebuilt.query(seed);
        assert.deepEqual(await counts(rebuilt), { inquiries: 1, keys: 1, jobs: 1 });
      } finally { await rebuilt.end(); }
    });

    await t.test("concurrent identical retries canonicalize UUID and persist one complete unit", async () => {
      const key = randomUUID();
      const results = await Promise.all(Array.from({ length: 16 }, (_, i) => record(i % 2 ? key.toUpperCase() : key)));
      assert.ok(results.every((result) => result.kind === "recorded"));
      assert.equal(new Set(results.map((result) => result.inquiryId)).size, 1);
      assert.deepEqual(await counts(admin), { inquiries: 1, keys: 1, jobs: 1 });
      const fresh = await connect();
      try {
        const rows = await fresh.query("select requested_date::text, guests from inquiry_private.inquiries where id=$1", [results[0].inquiryId]);
        assert.deepEqual(rows.rows[0], { requested_date: "2026-12-15", guests: 8 });
      } finally { await fresh.end(); }
      assert.equal((await record(key, { ...inquiry, message: "Changed payload" })).kind, "conflict");
      assert.equal((await record(key, inquiry, { ...notification, recipient: "other@example.invalid" })).kind, "conflict");
      assert.deepEqual(await counts(admin), { inquiries: 1, keys: 1, jobs: 1 });
    });

    await t.test("concurrent changed payloads select one winner without replacing snapshot", async () => {
      const before = await counts(admin);
      const key = randomUUID();
      const results = await Promise.all(Array.from({ length: 10 }, (_, i) => record(key, { ...inquiry, message: `Variant ${i}` })));
      assert.equal(results.filter((result) => result.kind === "recorded").length, 1);
      assert.equal(results.filter((result) => result.kind === "conflict").length, 9);
      assert.deepEqual(await counts(admin), { inquiries: before.inquiries + 1, keys: before.keys + 1, jobs: before.jobs + 1 });
    });

    await t.test("job constraint failure rolls back inquiry and key, then retry can succeed", async () => {
      const before = await counts(admin);
      const key = randomUUID();
      await assert.rejects(record(key, inquiry, { ...notification, body: "" }), (error) => error.code === "23514");
      assert.deepEqual(await counts(admin), before);
      assert.equal((await record(key)).kind, "recorded");
    });

    await t.test("a blocked competing retry succeeds after claim transaction rolls back", async () => {
      const claimant = await connect();
      const key = randomUUID();
      try {
        await claimant.query("begin; set local role service_role");
        await claimant.query("select public.record_contact_inquiry($1::jsonb,$2::uuid,$3::jsonb)", [inquiry, key, notification]);
        const competitor = record(key);
        // Observe the actual lock wait rather than guessing from a timing delay.
        let blocked = false;
        const deadline = Date.now() + 5000;
        while (Date.now() < deadline) {
          const wait = await admin.query("select count(*)::int n from pg_stat_activity where datname='inquiry_test' and wait_event_type='Lock'");
          if (wait.rows[0].n > 0) { blocked = true; break; }
          await new Promise((done) => setTimeout(done, 20));
        }
        await claimant.query("rollback");
        const result = await competitor;
        assert.ok(blocked, "competing transaction waited for key claim");
        assert.equal(result.kind, "recorded");
        const rows = await admin.query("select count(*)::int n from inquiry_private.submission_keys where key=$1", [key]);
        assert.equal(rows.rows[0].n, 1);
      } finally { await claimant.end(); }
    });

    await t.test("keyless legacy calls create separate complete units", async () => {
      const before = await counts(admin);
      const results = await Promise.all([record(null), record(null)]);
      assert.notEqual(results[0].inquiryId, results[1].inquiryId);
      assert.deepEqual(await counts(admin), { inquiries: before.inquiries + 2, keys: before.keys, jobs: before.jobs + 2 });
    });

    await t.test("constraints reject invalid state, date, shape, orphan and duplicate purpose; payload is immutable", async () => {
      const result = await record();
      await rejectsSql(admin, "update inquiry_private.inquiries set status='invented' where id=$1", [result.inquiryId], "23514");
      await assert.rejects(record(randomUUID(), { ...inquiry, date: "2026-02-30" }), (error) => error.code === "22023");
      const isoYearZero = await record(randomUUID(), { ...inquiry, date: "0000-02-29" });
      assert.equal((await admin.query("select requested_date from inquiry_private.inquiries where id=$1", [isoYearZero.inquiryId])).rows[0].requested_date, "0000-02-29");
      await assert.rejects(record(randomUUID(), { ...inquiry, guests: "0" }), (error) => error.code === "22023");
      await assert.rejects(record(randomUUID(), { ...inquiry, status: "resolved" }), (error) => error.code === "22023");
      await assert.rejects(record(randomUUID(), { ...inquiry, message: "x".repeat(5001) }), (error) => error.code === "23514");
      await rejectsSql(admin, "update inquiry_private.notification_jobs set body='Replacement' where inquiry_id=$1", [result.inquiryId], "23514");
      const duplicate = `insert into inquiry_private.notification_jobs(inquiry_id,purpose,payload_version,sender,recipient,reply_to,subject,body)
        values ($1,'staff_notification',1,'sender@example.invalid','staff@example.invalid','guest@example.invalid','Test','Test')`;
      await rejectsSql(admin, duplicate, [result.inquiryId], "23505");
      await rejectsSql(admin, duplicate, [randomUUID()], "23503");
    });

    await t.test("anonymous, authenticated and claimed staff cannot read/write/invoke; RLS remains closed even with accidental read grants", async () => {
      const denied = await connect();
      try {
        for (const role of ["anon", "authenticated"]) {
          await denied.query(`set role ${role}`);
          await denied.query("select set_config('request.jwt.claims', '{\"role\":\"authenticated\",\"user_metadata\":{\"role\":\"owner\"}}', false)");
          for (const table of ["inquiries", "submission_keys", "notification_jobs"]) {
            await rejectsSql(denied, `select * from inquiry_private.${table}`, [], "42501");
            await rejectsSql(denied, `delete from inquiry_private.${table}`, [], "42501");
          }
          await rejectsSql(denied, "select public.record_contact_inquiry($1::jsonb,$2::uuid,$3::jsonb)", [inquiry, randomUUID(), notification], "42501");
          await denied.query("reset role");
        }
        // Temporary test-only grants demonstrate RLS independently from missing privileges.
        await admin.query("begin; grant usage on schema inquiry_private to authenticated; grant select on all tables in schema inquiry_private to authenticated; set local role authenticated");
        for (const table of ["inquiries", "submission_keys", "notification_jobs"]) {
          assert.equal((await admin.query(`select * from inquiry_private.${table}`)).rowCount, 0);
        }
        await admin.query("rollback");
        await denied.query("set role service_role");
        await rejectsSql(denied, "update inquiry_private.notification_jobs set body='changed'", [], "42501");
        await rejectsSql(denied, "delete from inquiry_private.submission_keys", [], "42501");
      } finally { await denied.end(); }
    });
  } finally {
    if (admin) await admin.end();
    await cluster.stop();
    // Keep the uniquely generated, ignored fixture for diagnosis. No recursive deletion.
  }
});
