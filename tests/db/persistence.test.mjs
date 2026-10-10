import assert from "node:assert/strict";
import { readFileSync, readdirSync, mkdirSync, mkdtempSync } from "node:fs";
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
const migration = readdirSync("supabase/migrations").filter((name) => name.endsWith(".sql")).sort()
  .map((name) => readFileSync(join("supabase/migrations", name), "utf8")).join("\n");
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
async function asService(sql, values = []) {
  const client = await connect();
  try {
    await client.query("set role service_role");
    return (await client.query(sql, values)).rows;
  } finally { await client.end(); }
}
const claim = (limit = 20, lease = 60) => asService("select * from public.claim_notification_jobs($1,$2)", [limit, lease]);
const complete = async (job, outcome, messageId = null, error = outcome === "accepted" ? null : "test_error") =>
  (await asService("select public.complete_notification_job($1,$2,$3,$4,$5) ok", [job.job_id, job.lease_token, outcome, messageId, error]))[0].ok;
const deliver = async (eventId, type, emailId, jobId = null, at = "2026-10-09T12:00:00Z") =>
  (await asService("select public.record_delivery_event($1,$2,$3,$4,$5) r", [eventId, type, emailId, jobId, at]))[0].r;
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

    await t.test("worker: concurrent claims never share a job and return the immutable payload", async () => {
      await admin.query("update inquiry_private.notification_jobs set state='failed' where state='pending'");
      const ids = [];
      for (let i = 0; i < 12; i++) ids.push((await record()).inquiryId);
      const batches = await Promise.all(Array.from({ length: 6 }, () => claim(3)));
      const claimed = batches.flat();
      assert.equal(claimed.length, 12);
      assert.equal(new Set(claimed.map((job) => job.job_id)).size, 12);
      assert.ok(claimed.every((job) => job.attempt === 1 && job.recipient === notification.recipient && job.body === notification.body));
      assert.equal((await claim()).length, 0, "active leases are not reclaimed");
      for (const job of claimed) assert.equal(await complete(job, "accepted", `msg-${job.job_id}`), true);
    });

    await t.test("worker: outcomes need the current lease; retries back off; ambiguity is remembered", async () => {
      await record();
      let [job] = await claim();
      assert.equal(await complete({ ...job, lease_token: randomUUID() }, "accepted", "msg"), false);
      await rejectsSql(admin, "select public.complete_notification_job($1,$2,'accepted',null,null)", [job.job_id, job.lease_token], "22023");
      await rejectsSql(admin, "select public.complete_notification_job($1,$2,'sent',null,null)", [job.job_id, job.lease_token], "22023");
      assert.equal(await complete(job, "ambiguous"), true);
      assert.equal(await complete(job, "accepted", "late"), false, "a finished lease cannot be completed twice");
      let row = (await admin.query("select state, maybe_sent, available_at > now() delayed, last_error from inquiry_private.notification_jobs where id=$1", [job.job_id])).rows[0];
      assert.deepEqual(row, { state: "pending", maybe_sent: true, delayed: true, last_error: "test_error" });
      assert.equal((await claim()).length, 0, "backoff delays the retry");
      await admin.query("update inquiry_private.notification_jobs set available_at=now() where id=$1", [job.job_id]);
      [job] = await claim();
      assert.equal(job.attempt, 2);
      assert.equal(await complete(job, "rejected"), true);
      row = (await admin.query("select state from inquiry_private.notification_jobs where id=$1", [job.job_id])).rows[0];
      assert.equal(row.state, "uncertain", "a later rejection cannot prove an earlier ambiguous attempt was not sent");
    });

    await t.test("worker: crashed leases recover with the same job identity; exhausted jobs end explicitly", async () => {
      await record();
      const [crashed] = await claim();
      await admin.query("update inquiry_private.notification_jobs set leased_until=now()-interval '1 second' where id=$1", [crashed.job_id]);
      const [recovered] = await claim();
      assert.equal(recovered.job_id, crashed.job_id);
      assert.equal(recovered.attempt, 2);
      assert.equal(await complete(crashed, "accepted", "stale"), false, "the crashed worker lost its lease");
      assert.equal((await admin.query("select maybe_sent from inquiry_private.notification_jobs where id=$1", [crashed.job_id])).rows[0].maybe_sent, true);
      assert.equal(await complete(recovered, "accepted", "msg-recovered"), true);

      await record();
      let [job] = await claim();
      await admin.query("update inquiry_private.notification_jobs set attempts=8 where id=$1", [job.job_id]);
      assert.equal(await complete(job, "retryable"), true);
      assert.equal((await admin.query("select state from inquiry_private.notification_jobs where id=$1", [job.job_id])).rows[0].state, "failed");

      await record();
      [job] = await claim();
      await admin.query("update inquiry_private.notification_jobs set first_attempt_at=now()-interval '24 hours', leased_until=now()-interval '1 second' where id=$1", [job.job_id]);
      assert.equal((await claim()).length, 0, "no blind resend outside the idempotency window");
      const row = (await admin.query("select state, last_error, lease_token from inquiry_private.notification_jobs where id=$1", [job.job_id])).rows[0];
      assert.deepEqual(row, { state: "uncertain", last_error: "lease_expired", lease_token: null });
      await rejectsSql(admin, "select * from public.claim_notification_jobs(0, 60)", [], "22023");
      await rejectsSql(admin, "select * from public.claim_notification_jobs(5, 5)", [], "22023");
    });

    await t.test("delivery: tagged events resolve lost responses once; status never regresses; untrusted links are refused", async () => {
      const jobOf = async (inquiryId) => (await admin.query("select id from inquiry_private.notification_jobs where inquiry_id=$1", [inquiryId])).rows[0].id;
      const job = async (id) => (await admin.query("select state, provider_message_id, last_error from inquiry_private.notification_jobs where id=$1", [id])).rows[0];
      const status = async (id) => (await admin.query("select delivery_status from inquiry_private.job_delivery_status where job_id=$1", [id])).rows[0]?.delivery_status;

      await admin.query("update inquiry_private.notification_jobs set state='failed' where state='pending'");
      // Lost send response after the window: uncertain until a signed event proves acceptance.
      const lost = await jobOf((await record()).inquiryId);
      await admin.query("update inquiry_private.notification_jobs set state='uncertain', maybe_sent=true, last_error='provider_timeout' where id=$1", [lost]);
      assert.equal(await deliver("msg_a", "email.delivered", "email-lost", lost, "2026-10-09T12:00:05Z"), "recorded");
      assert.deepEqual(await job(lost), { state: "accepted", provider_message_id: "email-lost", last_error: null });
      const dupes = await Promise.all(Array.from({ length: 5 }, () => deliver("msg_a", "email.delivered", "email-lost", lost)));
      assert.deepEqual(dupes, Array(5).fill("duplicate"));
      // Delayed earlier events arrive after delivery: stored, but status stays delivered.
      assert.equal(await deliver("msg_b", "email.sent", "email-lost", lost, "2026-10-09T12:00:01Z"), "recorded");
      assert.equal(await deliver("msg_c", "email.delivery_delayed", "email-lost", null, "2026-10-09T12:00:03Z"), "recorded", "matched by message ID without a tag");
      assert.equal(await status(lost), "email.delivered");
      assert.equal(await deliver("msg_d", "email.complained", "email-lost", lost, "2026-10-09T12:10:00Z"), "recorded");
      assert.equal(await status(lost), "email.complained");
      assert.equal((await admin.query("select count(*)::int n from inquiry_private.delivery_events where job_id=$1", [lost])).rows[0].n, 4);

      // An event during a lease settles the job at once, so a worker crash cannot resend or strand it.
      await record();
      const [leased] = await claim();
      assert.equal(await deliver("msg_e", "email.sent", "email-leased", leased.job_id), "recorded");
      assert.deepEqual(await job(leased.job_id), { state: "accepted", provider_message_id: "email-leased", last_error: null });
      assert.equal(await complete(leased, "ambiguous"), true, "the worker's late report finds the job settled");
      assert.deepEqual(await job(leased.job_id), { state: "accepted", provider_message_id: "email-leased", last_error: null });
      await record();
      const [crashed] = await claim();
      assert.equal(await deliver("msg_e2", "email.delivered", "email-crashed", crashed.job_id), "recorded");
      await admin.query("update inquiry_private.notification_jobs set leased_until=now()-interval '1 second' where id=$1", [crashed.job_id]);
      assert.equal((await claim()).length, 0, "a delivered job is never reclaimed after its worker crashes");

      // Untagged foreign mail is not stored; unknown or contradicting tags are stored unmatched, never attached.
      assert.equal(await deliver("msg_f", "email.sent", "email-foreign"), "unrelated");
      assert.equal(await deliver("msg_g", "email.sent", "email-unknown-job", randomUUID()), "recorded");
      assert.equal(await deliver("msg_h", "email.bounced", "email-other", lost), "recorded", "tag disagrees with stored message ID");
      assert.equal(await deliver("msg_h2", "email.bounced", "email-leased", lost), "recorded", "email ID wins over a wrong tag");
      const unmatched = (await admin.query("select event_id from inquiry_private.delivery_events where job_id is null order by event_id")).rows;
      assert.deepEqual(unmatched.map((r) => r.event_id), ["msg_g", "msg_h"]);
      assert.equal(await status(lost), "email.complained");
      assert.equal(await status(leased.job_id), "email.bounced");

      // The unmatched backlog is bounded; overflow stores nothing so Resend retries later.
      await admin.query("insert into inquiry_private.delivery_events(event_id, event_type, email_id, occurred_at) select 'fill_' || g, 'email.sent', 'fill', now() from generate_series(1, 9998) g");
      assert.equal(await deliver("msg_i", "email.sent", "email-overflow", randomUUID()), "overflow");
      assert.equal(await deliver("msg_j", "email.delivered", "email-lost", lost), "recorded", "matched events still record");
      await admin.query("delete from inquiry_private.delivery_events where event_id like 'fill_%'");
      await rejectsSql(admin, "select public.record_delivery_event('msg_k','email.opened','x',$1,now())", [randomUUID()], "23514");
      await rejectsSql(admin, "select public.record_delivery_event('bad id','email.sent','x',$1,now())", [randomUUID()], "23514");
    });

    await t.test("anonymous, authenticated and claimed staff cannot read/write/invoke; RLS remains closed even with accidental read grants", async () => {
      const denied = await connect();
      try {
        for (const role of ["anon", "authenticated"]) {
          await denied.query(`set role ${role}`);
          await denied.query("select set_config('request.jwt.claims', '{\"role\":\"authenticated\",\"user_metadata\":{\"role\":\"owner\"}}', false)");
          for (const table of ["inquiries", "submission_keys", "notification_jobs", "delivery_events", "job_delivery_status"]) {
            await rejectsSql(denied, `select * from inquiry_private.${table}`, [], "42501");
            await rejectsSql(denied, `delete from inquiry_private.${table}`, [], "42501");
          }
          await rejectsSql(denied, "select public.record_contact_inquiry($1::jsonb,$2::uuid,$3::jsonb)", [inquiry, randomUUID(), notification], "42501");
          await rejectsSql(denied, "select * from public.claim_notification_jobs(5, 60)", [], "42501");
          await rejectsSql(denied, "select public.complete_notification_job($1,$2,'accepted','x',null)", [randomUUID(), randomUUID()], "42501");
          await rejectsSql(denied, "select public.record_delivery_event('msg_x','email.sent','x',null,now())", [], "42501");
          await denied.query("reset role");
        }
        // Temporary test-only grants demonstrate RLS independently from missing privileges.
        await admin.query("begin; grant usage on schema inquiry_private to authenticated; grant select on all tables in schema inquiry_private to authenticated; set local role authenticated");
        for (const table of ["inquiries", "submission_keys", "notification_jobs", "delivery_events"]) {
          assert.equal((await admin.query(`select * from inquiry_private.${table}`)).rowCount, 0);
        }
        await admin.query("rollback");
        await denied.query("set role service_role");
        await rejectsSql(denied, "update inquiry_private.notification_jobs set body='changed'", [], "42501");
        await rejectsSql(denied, "delete from inquiry_private.submission_keys", [], "42501");
        await rejectsSql(denied, "update inquiry_private.notification_jobs set recipient='other@example.invalid'", [], "42501");
        await rejectsSql(denied, "update inquiry_private.inquiries set status='resolved'", [], "42501");
        await rejectsSql(denied, "update inquiry_private.delivery_events set job_id=null", [], "42501");
      } finally { await denied.end(); }
    });
  } finally {
    if (admin) await admin.end();
    await cluster.stop();
    // Keep the uniquely generated, ignored fixture for diagnosis. No recursive deletion.
  }
});
