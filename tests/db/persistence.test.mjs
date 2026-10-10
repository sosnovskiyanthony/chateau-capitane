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
const inquiry = { name: "Synthetic Guest", email: "guest@example.invalid", phone: "", date: "2026-12-15", guests: "8", message: "Synthetic request", kind: "contact", eventPackage: "" };
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

    await t.test("limits: instances share counters; recorded-key retries pass; expired windows are deleted", async () => {
      const limit = async (subject, key = null, subjectLimit = 5, globalLimit = 1000) => (await asService(
        "select public.check_contact_limit($1,$2,$3,86400,$4,86400) r", [subject, key, subjectLimit, globalLimit]))[0].r;
      const subject = randomBytes(32).toString("hex");
      // Separate connections stand in for separate Vercel instances.
      const results = await Promise.all(Array.from({ length: 12 }, () => limit(subject)));
      assert.equal(results.filter((r) => r.allowed).length, 5);
      for (const r of results.filter((r) => !r.allowed)) assert.ok(r.retryAfter >= 1 && r.retryAfter <= 86400);
      assert.equal((await limit(subject, randomUUID())).allowed, false);
      const recorded = randomUUID();
      assert.equal((await record(recorded)).kind, "recorded");
      assert.deepEqual(await limit(subject, recorded), { allowed: true });
      // Site-wide bucket: distinct clients still stop at the global limit.
      await admin.query("delete from inquiry_private.rate_limit_hits");
      const spread = await Promise.all(Array.from({ length: 6 }, () => limit(randomBytes(32).toString("hex"), null, 5, 3)));
      assert.equal(spread.filter((r) => r.allowed).length, 3);
      await admin.query("insert into inquiry_private.rate_limit_hits values ('global', now() - interval '2 days', now() - interval '1 day', 9)");
      await limit(subject);
      assert.equal((await admin.query("select count(*)::int n from inquiry_private.rate_limit_hits where expires_at <= now()")).rows[0].n, 0);
      const stored = (await admin.query("select bucket from inquiry_private.rate_limit_hits")).rows.map((row) => row.bucket);
      assert.ok(stored.every((bucket) => /^(global|subject:[0-9a-f]{64})$/.test(bucket)));
      for (const args of [["not-hex", 5, 60], [subject, 0, 60], [subject, 5, 0], [subject, 5, 90000]]) {
        await rejectsSql(admin, "select public.check_contact_limit($1,null,$2,$3,5,60)", args, "22023");
      }
    });

    await t.test("staff: membership is read-only to the server; roles come from the table, never JWT metadata; login limits count", async () => {
      const owner = randomUUID(), staff = randomUUID(), stranger = randomUUID();
      await admin.query("insert into inquiry_private.staff_members(user_id, role) values ($1,'owner'),($2,'staff')", [owner, staff]);
      const role = async (id) => (await asService("select public.staff_role($1) r", [id]))[0].r;
      assert.equal(await role(owner), "owner");
      assert.equal(await role(staff), "staff");
      assert.equal(await role(stranger), null);
      await rejectsSql(admin, "insert into inquiry_private.staff_members values ($1,'editor')", [stranger], "23514");
      const server = await connect();
      try {
        await server.query("set role service_role");
        // Claimed metadata changes nothing: only table rows count.
        await server.query("select set_config('request.jwt.claims', $1, false)",
          [JSON.stringify({ sub: stranger, user_metadata: { role: "owner" }, app_metadata: { role: "owner" } })]);
        assert.equal((await server.query("select public.staff_role($1) r", [stranger])).rows[0].r, null);
        // No code path can grant, change or remove a role.
        await rejectsSql(server, "insert into inquiry_private.staff_members values ($1,'owner')", [stranger], "42501");
        await rejectsSql(server, "update inquiry_private.staff_members set role='owner' where user_id=$1", [staff], "42501");
        await rejectsSql(server, "delete from inquiry_private.staff_members where user_id=$1", [owner], "42501");
      } finally { await server.end(); }
      // Revocation is a row delete by the database owner; the next check sees it.
      await admin.query("delete from inquiry_private.staff_members where user_id=$1", [staff]);
      assert.equal(await role(staff), null);

      const login = async (subject, limit = 3) => (await asService("select public.check_login_limit($1,$2,900) r", [subject, limit]))[0].r;
      const subject = randomBytes(32).toString("hex");
      const results = await Promise.all(Array.from({ length: 6 }, () => login(subject)));
      assert.equal(results.filter((r) => r.allowed).length, 3);
      for (const r of results.filter((r) => !r.allowed)) assert.ok(r.retryAfter >= 1 && r.retryAfter <= 900);
      assert.equal((await login(randomBytes(32).toString("hex"))).allowed, true);
      // Login and contact counters never share a bucket.
      assert.equal((await admin.query("select count(*)::int n from inquiry_private.rate_limit_hits where bucket = $1", ["login:" + subject])).rows[0].n, 1);
      assert.equal((await admin.query("select count(*)::int n from inquiry_private.rate_limit_hits where bucket = $1", ["subject:" + subject])).rows[0].n, 0);
      for (const args of [["not-hex", 5, 60], [subject, 0, 60], [subject, 5, 0], [subject, 5, 90000]]) {
        await rejectsSql(admin, "select public.check_login_limit($1,$2,$3)", args, "22023");
      }
    });

    await t.test("inbox: staff list/filter/page, versioned status changes, audited roles, bounded append-only notes", async () => {
      const staff = randomUUID(), revoked = randomUUID();
      await admin.query("insert into inquiry_private.staff_members(user_id, role) values ($1,'staff'),($2,'staff')", [staff, revoked]);
      const call = async (fn, args) => (await asService(`select public.${fn}(${args.map((_, i) => `$${i + 1}`).join(",")}) r`, args))[0].r;
      const list = (status = null, search = null, at = null, id = null, limit = 100) =>
        call("staff_list_inquiries", [staff, status, search, at, id, limit]);
      const setStatus = (id, version, status, who = staff) => call("staff_set_inquiry_status", [who, "s@example.invalid", id, version, status]);

      const target = (await record(randomUUID(), { ...inquiry, name: "Findable 100%_Name" })).inquiryId;
      const all = await list();
      assert.ok(all.length >= 3 && all.some((row) => row.id === target));
      assert.ok(all.every((row, i) => i === 0 || row.createdAt <= all[i - 1].createdAt));
      assert.equal(all.find((row) => row.id === target).notification.state, "pending");
      // Search escapes LIKE wildcards; "%" alone matches only literal percent signs.
      assert.deepEqual((await list(null, "100%_n")).map((row) => row.id), [target]);
      assert.ok((await list(null, "%")).every((row) => row.name.includes("%")));
      // Keyset pages are disjoint and cover the list.
      const first = await list(null, null, null, null, 2);
      const rest = await list(null, null, first[1].createdAt, first[1].id, 100);
      assert.deepEqual([...first, ...rest].map((row) => row.id), all.map((row) => row.id));

      const detail = await call("staff_get_inquiry", [staff, target]);
      assert.equal(detail.message, inquiry.message);
      assert.equal(detail.version, 1);
      assert.equal(await call("staff_get_inquiry", [staff, randomUUID()]), null);

      // Two editors saw version 1: the first wins, the second is told it is stale and changes nothing.
      const [a, b] = await Promise.all([setStatus(target, 1, "in_progress"), setStatus(target, 1, "resolved")]);
      assert.deepEqual([a.kind, b.kind].sort(), ["stale", "updated"]);
      const after = await call("staff_get_inquiry", [staff, target]);
      assert.equal(after.version, 2);
      assert.equal(after.status, a.kind === "updated" ? "in_progress" : "resolved");
      // Resolved can only reopen to in_progress; no move back to new.
      if (after.status === "in_progress") assert.equal((await setStatus(target, 2, "resolved")).kind, "updated");
      const resolvedVersion = after.status === "in_progress" ? 3 : 2;
      assert.equal((await setStatus(target, resolvedVersion, "new")).kind, "invalid");
      assert.equal((await setStatus(target, resolvedVersion, "resolved")).kind, "invalid");
      assert.deepEqual(await setStatus(target, resolvedVersion, "in_progress"), { kind: "updated", status: "in_progress", version: resolvedVersion + 1 });
      assert.equal((await setStatus(randomUUID(), 1, "resolved")).kind, "not_found");
      assert.deepEqual((await list("in_progress")).map((row) => row.id).includes(target), true);
      const history = (await call("staff_get_inquiry", [staff, target])).history;
      assert.equal(history.length, resolvedVersion);
      assert.deepEqual(history.at(-1), { ...history.at(-1), actor: "s@example.invalid", from: "resolved", to: "in_progress" });

      // Notes: trimmed, bounded in length and count; concurrent adds cannot exceed 100.
      assert.equal((await call("staff_add_inquiry_note", [staff, "s@example.invalid", target, "  Called back  "])).kind, "added");
      await assert.rejects(call("staff_add_inquiry_note", [staff, "s@example.invalid", target, "x".repeat(2001)]), (e) => e.code === "23514");
      await assert.rejects(call("staff_add_inquiry_note", [staff, "s@example.invalid", target, "   "]), (e) => e.code === "23514");
      const adds = await Promise.all(Array.from({ length: 110 }, (_, i) => call("staff_add_inquiry_note", [staff, "s@example.invalid", target, `n${i}`])));
      assert.equal(adds.filter((r) => r.kind === "added").length, 99);
      assert.equal(adds.filter((r) => r.kind === "full").length, 11);
      const notes = (await call("staff_get_inquiry", [staff, target])).notes;
      assert.equal(notes.length, 100);
      assert.deepEqual(notes[0], { ...notes[0], author: "s@example.invalid", body: "Called back" });

      // Audit rows never hold guest text; role grants/changes/revocations are recorded by trigger.
      await admin.query("update inquiry_private.staff_members set role='owner' where user_id=$1", [revoked]);
      const moved = randomUUID();
      await admin.query("update inquiry_private.staff_members set user_id=$2 where user_id=$1", [revoked, moved]);
      await admin.query("update inquiry_private.staff_members set user_id=$1 where user_id=$2", [revoked, moved]);
      assert.deepEqual((await admin.query("select action from inquiry_private.audit_events where subject_user=$1 order by id", [moved])).rows.map((r) => r.action), ["role_granted", "role_revoked"]);
      await admin.query("delete from inquiry_private.staff_members where user_id=$1", [revoked]);
      const roleAudit = (await admin.query("select action, from_value, to_value from inquiry_private.audit_events where subject_user=$1 order by id", [revoked])).rows;
      assert.deepEqual(roleAudit, [{ action: "role_granted", from_value: null, to_value: "staff" },
        { action: "role_changed", from_value: "staff", to_value: "owner" }, { action: "role_revoked", from_value: "owner", to_value: null },
        { action: "role_granted", from_value: null, to_value: "owner" }, { action: "role_revoked", from_value: "owner", to_value: null }]);
      const auditText = JSON.stringify((await admin.query("select * from inquiry_private.audit_events")).rows);
      assert.ok(!auditText.includes(inquiry.message) && !auditText.includes(inquiry.email) && !auditText.includes("Called back"));

      // A revoked or unknown member is refused by every function, and nothing changes.
      for (const [fn, args] of [["staff_list_inquiries", [revoked, null, null, null, null, 10]], ["staff_get_inquiry", [revoked, target]],
        ["staff_set_inquiry_status", [revoked, "x", target, resolvedVersion + 1, "resolved"]], ["staff_add_inquiry_note", [null, "x", target, "y"]]]) {
        await assert.rejects(call(fn, args), (e) => e.code === "42501");
      }
      assert.equal((await call("staff_get_inquiry", [staff, target])).version, resolvedVersion + 1);
      for (const args of [[staff, "bogus", null, null, null, 10], [staff, null, "x".repeat(101), null, null, 10],
        [staff, null, null, null, null, 0], [staff, null, null, new Date().toISOString(), null, 10]]) {
        await assert.rejects(call("staff_list_inquiries", args), (e) => e.code === "22023");
      }
      const server = await connect();
      try {
        await server.query("set role service_role");
        await rejectsSql(server, "update inquiry_private.inquiries set message='x'", [], "42501");
        // Status, notes and audit change only through the audited functions.
        await rejectsSql(server, "update inquiry_private.inquiries set status='new', version=1", [], "42501");
        await rejectsSql(server, "insert into inquiry_private.inquiry_notes(inquiry_id, author_id, author_email, body) values ($1,$2,'x','y')", [target, staff], "42501");
        await rejectsSql(server, "insert into inquiry_private.audit_events(action) values ('status_changed')", [], "42501");
        await rejectsSql(server, "update inquiry_private.inquiry_notes set body='x'", [], "42501");
        await rejectsSql(server, "delete from inquiry_private.audit_events", [], "42501");
        await rejectsSql(server, "insert into inquiry_private.staff_members values ($1,'owner')", [randomUUID()], "42501");
      } finally { await server.end(); }
    });

    await t.test("events: package snapshot and date kept, same inbox, invalid kinds and shapes refused", async () => {
      const staff = randomUUID();
      await admin.query("insert into inquiry_private.staff_members(user_id, role) values ($1,'staff')", [staff]);
      const call = async (fn, args) => (await asService(`select public.${fn}(${args.map((_, i) => `$${i + 1}`).join(",")}) r`, args))[0].r;
      const event = { ...inquiry, kind: "event", eventPackage: "Banquet, $140 per person", date: "2026-12-31", guests: "40" };
      const key = randomUUID();
      const stored = await record(key, event);
      assert.deepEqual(await record(key, event), stored);
      assert.equal((await record(key, { ...event, eventPackage: "Banquet, $170 per person" })).kind, "conflict");
      assert.equal((await record(key, { ...event, kind: "contact", eventPackage: "" })).kind, "conflict");
      const undecided = await record(randomUUID(), { ...event, eventPackage: "" });
      const plain = await record(randomUUID(), { ...inquiry, name: "Plain Contact" });

      const detail = await call("staff_get_inquiry", [staff, stored.inquiryId]);
      assert.deepEqual([detail.kind, detail.eventPackage, detail.requestedDate, detail.guests],
        ["event", "Banquet, $140 per person", "2026-12-31", 40]);
      assert.deepEqual([(await call("staff_get_inquiry", [staff, undecided.inquiryId])).eventPackage,
        (await call("staff_get_inquiry", [staff, plain.inquiryId])).kind], [null, "contact"]);
      const rows = await call("staff_list_inquiries", [staff, "new", null, null, null, 100]);
      const kinds = Object.fromEntries(rows.map((row) => [row.id, [row.kind, row.eventPackage]]));
      assert.deepEqual([kinds[stored.inquiryId], kinds[undecided.inquiryId], kinds[plain.inquiryId]],
        [["event", "Banquet, $140 per person"], ["event", null], ["contact", null]]);
      assert.equal((await call("staff_set_inquiry_status", [staff, "s@example.invalid", stored.inquiryId, 1, "in_progress"])).kind, "updated");

      const sixFields = Object.fromEntries(Object.entries(inquiry).filter(([field]) => !["kind", "eventPackage"].includes(field)));
      const legacy = await record(randomUUID(), sixFields);
      assert.equal((await call("staff_get_inquiry", [staff, legacy.inquiryId])).kind, "contact");
      // A six-field retry still matches a plain contact recorded with explicit kind (same fingerprint).
      const sameKey = randomUUID();
      assert.deepEqual(await record(sameKey, sixFields), await record(sameKey, inquiry));
      for (const input of [{ ...inquiry, kind: "booking" }, { ...inquiry, eventPackage: "Banquet, $140 per person" },
        { ...event, eventPackage: 140 }, { ...event, confirmed: "yes" }]) {
        await assert.rejects(record(randomUUID(), input), (error) => error.code === "22023");
      }
      for (const eventPackage of [" padded ", "line\nbreak", "x".repeat(201)]) {
        await assert.rejects(record(randomUUID(), { ...event, eventPackage }), (error) => error.code === "23514");
      }
      await rejectsSql(admin, "update inquiry_private.inquiries set event_package='x' where id=$1", [plain.inquiryId], "23514");
      const server = await connect();
      try {
        await server.query("set role service_role");
        await rejectsSql(server, "update inquiry_private.inquiries set event_package='Banquet, $230 per person'", [], "42501");
        await rejectsSql(server, "update inquiry_private.inquiries set kind='contact'", [], "42501");
      } finally { await server.end(); }
    });

    await t.test("content: drafts are versioned, concurrent saves detected, publication and rollback, staff-only writes", async () => {
      const staff = randomUUID(), revoked = randomUUID();
      await admin.query("insert into inquiry_private.staff_members(user_id, role) values ($1,'staff'),($2,'owner')", [staff, revoked]);
      const call = async (fn, args) => (await asService(`select public.${fn}(${args.map((_, i) => `$${i + 1}`).join(",")}) r`, args))[0].r;
      const save = (base, document, who = staff) => call("staff_save_content_draft", [who, "editor@example.invalid", base, document]);
      const live = async () => (await asService("select public.published_content() r"))[0].r;
      const v1 = { menuNotes: ["first"] }, v2 = { menuNotes: ["second"] };

      assert.equal(await live(), null);
      assert.deepEqual((await call("staff_content_state", [staff])), { draft: null, publishedId: null, revisions: [], publications: [] });
      const first = await save(null, v1);
      assert.equal(first.kind, "saved");
      assert.equal((await save(null, v1)).kind, "stale");
      // Two editors loaded the same draft: exactly one save wins.
      const racing = await Promise.all([save(first.id, v2), save(first.id, { menuNotes: ["other"] })]);
      assert.deepEqual(racing.map((r) => r.kind).sort(), ["saved", "stale"]);
      const second = racing.find((r) => r.kind === "saved");
      const state = await call("staff_content_state", [staff]);
      assert.deepEqual([state.draft.id, state.publishedId, state.revisions.map((r) => r.id)], [second.id, null, [second.id, first.id]]);
      assert.equal(state.draft.author, "editor@example.invalid");

      // Drafts stay private until published; publishing an older revision rolls back.
      assert.equal(await live(), null);
      assert.deepEqual(await call("staff_publish_content", [staff, "editor@example.invalid", second.id]), { kind: "published" });
      assert.deepEqual(await live(), { revision: second.id, document: (await call("staff_content_revision", [staff, second.id])).document });
      assert.equal((await save(second.id, { menuNotes: ["draft only"] })).kind, "saved");
      assert.equal((await live()).revision, second.id);
      assert.equal((await call("staff_publish_content", [staff, "editor@example.invalid", first.id])).kind, "published");
      assert.deepEqual(await live(), { revision: first.id, document: v1 });
      assert.deepEqual((await call("staff_publish_content", [staff, "x", 999999])).kind, "not_found");
      assert.equal(await call("staff_content_revision", [staff, 999999]), null);
      const history = (await call("staff_content_state", [staff])).publications;
      assert.deepEqual(history.map((p) => [p.revision, p.by]), [[first.id, "editor@example.invalid"], [second.id, "editor@example.invalid"]]);

      // Shape and size bounds; only current staff can read or write; the server key cannot write tables directly.
      const head = (await call("staff_content_state", [staff])).draft.id;
      await assert.rejects(save(head, "[1, 2]"), (e) => e.code === "23514");
      await assert.rejects(save(head, { big: "x".repeat(262144) }), (e) => e.code === "23514");
      await admin.query("delete from inquiry_private.staff_members where user_id=$1", [revoked]);
      for (const [fn, args] of [["staff_content_state", [revoked]], ["staff_content_revision", [revoked, first.id]],
        ["staff_save_content_draft", [revoked, "x", head, v1]], ["staff_publish_content", [revoked, "x", second.id]],
        ["staff_publish_content", [null, "x", second.id]]]) {
        await assert.rejects(call(fn, args), (e) => e.code === "42501");
      }
      assert.equal((await live()).revision, first.id);
      const server = await connect();
      try {
        await server.query("set role service_role");
        await rejectsSql(server, "insert into inquiry_private.content_revisions(document, author_id, author_email) values ('{}', $1, 'x')", [staff], "42501");
        await rejectsSql(server, "insert into inquiry_private.content_publications(revision_id, publisher_id, publisher_email) values ($1, $2, 'x')", [first.id, staff], "42501");
        await rejectsSql(server, "update inquiry_private.content_revisions set document='{}'", [], "42501");
        await rejectsSql(server, "delete from inquiry_private.content_publications", [], "42501");
      } finally { await server.end(); }
    });

    await t.test("anonymous, authenticated and claimed staff cannot read/write/invoke; RLS remains closed even with accidental read grants", async () => {
      const denied = await connect();
      try {
        for (const role of ["anon", "authenticated"]) {
          await denied.query(`set role ${role}`);
          await denied.query("select set_config('request.jwt.claims', '{\"role\":\"authenticated\",\"user_metadata\":{\"role\":\"owner\"}}', false)");
          for (const table of ["inquiries", "submission_keys", "notification_jobs", "delivery_events", "job_delivery_status", "rate_limit_hits", "staff_members", "inquiry_notes", "audit_events", "content_revisions", "content_publications"]) {
            await rejectsSql(denied, `select * from inquiry_private.${table}`, [], "42501");
            await rejectsSql(denied, `delete from inquiry_private.${table}`, [], "42501");
          }
          await rejectsSql(denied, "select public.record_contact_inquiry($1::jsonb,$2::uuid,$3::jsonb)", [inquiry, randomUUID(), notification], "42501");
          await rejectsSql(denied, "select * from public.claim_notification_jobs(5, 60)", [], "42501");
          await rejectsSql(denied, "select public.complete_notification_job($1,$2,'accepted','x',null)", [randomUUID(), randomUUID()], "42501");
          await rejectsSql(denied, "select public.record_delivery_event('msg_x','email.sent','x',null,now())", [], "42501");
          await rejectsSql(denied, "select public.check_contact_limit(repeat('a',64),null,5,60,5,60)", [], "42501");
          await rejectsSql(denied, "select public.staff_role($1)", [randomUUID()], "42501");
          await rejectsSql(denied, "select public.check_login_limit(repeat('a',64),5,60)", [], "42501");
          await rejectsSql(denied, "select public.staff_list_inquiries($1,null,null,null,null,10)", [randomUUID()], "42501");
          await rejectsSql(denied, "select public.staff_get_inquiry($1,$1)", [randomUUID()], "42501");
          await rejectsSql(denied, "select public.staff_set_inquiry_status($1,'x',$1,1,'resolved')", [randomUUID()], "42501");
          await rejectsSql(denied, "select public.staff_add_inquiry_note($1,'x',$1,'y')", [randomUUID()], "42501");
          await rejectsSql(denied, "select public.published_content()", [], "42501");
          await rejectsSql(denied, "select public.staff_content_state($1)", [randomUUID()], "42501");
          await rejectsSql(denied, "select public.staff_content_revision($1,1)", [randomUUID()], "42501");
          await rejectsSql(denied, "select public.staff_save_content_draft($1,'x',null,'{}')", [randomUUID()], "42501");
          await rejectsSql(denied, "select public.staff_publish_content($1,'x',1)", [randomUUID()], "42501");
          await denied.query("reset role");
        }
        // Temporary test-only grants demonstrate RLS independently from missing privileges.
        await admin.query("begin; grant usage on schema inquiry_private to authenticated; grant select on all tables in schema inquiry_private to authenticated; set local role authenticated");
        for (const table of ["inquiries", "submission_keys", "notification_jobs", "delivery_events", "rate_limit_hits", "staff_members", "inquiry_notes", "audit_events", "content_revisions", "content_publications"]) {
          assert.equal((await admin.query(`select * from inquiry_private.${table}`)).rowCount, 0);
        }
        await admin.query("rollback");
        await denied.query("set role service_role");
        await rejectsSql(denied, "update inquiry_private.notification_jobs set body='changed'", [], "42501");
        await rejectsSql(denied, "delete from inquiry_private.submission_keys", [], "42501");
        await rejectsSql(denied, "update inquiry_private.notification_jobs set recipient='other@example.invalid'", [], "42501");
        await rejectsSql(denied, "update inquiry_private.delivery_events set job_id=null", [], "42501");
      } finally { await denied.end(); }
    });
  } finally {
    if (admin) await admin.end();
    await cluster.stop();
    // Keep the uniquely generated, ignored fixture for diagnosis. No recursive deletion.
  }
});
