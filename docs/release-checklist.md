# Staging and release checklist (B12)

Nothing here has been run: no staging project, deployment or live email exists yet. Do the steps in order; each needs the owner's go-ahead where marked **(owner)**. Use made-up guests only (names like "Test Guest", emails ending `.invalid` until the live-email step).

## 1. Accounts and costs (owner)

- Vercel Pro (cron every minute is rejected on Hobby) and Supabase Pro, in the company's name, regions `iad1` / `us-east-1`; about $45/month. Details: [provider decision](plans/backend-provider-decision.md).
- Resend account, the sending domain verified (SPF/DKIM records at the domain host), a staff address that receives inquiries.
- Free uptime monitor account (owner's email receives alerts).
- Names and emails of the first staff (owner role first).

## 2. Staging project (synthetic data)

1. Create a **separate** Supabase project for staging. Never reuse production keys.
2. Apply every file in `supabase/migrations/` in order (supported Supabase workflow; this is also **B02c**, the first time the database is checked through the real gateway and Auth). Keep the private schema unexposed.
3. Vercel Preview scope: staging `SUPABASE_URL` / `SUPABASE_SECRET_KEY`, own `CRON_SECRET`, own `RESEND_WEBHOOK_SECRET`; leave `RESEND_API_KEY` unset (jobs wait, nothing is sent).
4. Add the first staff member: [Staff access (B06)](../supabase/README.md#staff-access-b06).

## 3. Staging acceptance (tick each, note date)

| Area | Check |
| --- | --- |
| Contact | Send an inquiry; `202`, row appears in the staff inbox. Resubmit the same form (retry): still one inquiry. |
| Events | Ask about a package from `/private-events`; inbox shows "Private event: …". |
| Abuse limit | 6th send from one network in 10 minutes gets the call-us message. |
| Worker | With a test Resend key and a `.invalid`-safe address, the job is claimed on the minute; stop the cron mid-way, jobs resume. `/api/health` with the Bearer secret shows `ok`. |
| Delivery | Resend webhook (subscribed to email events) updates the delivery state on an inquiry. |
| Staff access | Invite email link sets a password; sign-in works; remove the member in SQL, next page load signs them out. |
| Content | Edit hours and a menu price, preview, publish: public pages change within the hour (or at once after publish); roll back. |
| Gallery | Upload a phone-sized photo, refused disguised file, publish, remove, rollback. |
| Buttons | OpenTable "Book now" and every "Call" link still work on `/`, `/menu`, `/private-events`, `/contact`. |
| Restore | Dashboard restore of a staging backup into a scratch project; compare row counts and run `/api/health`. Follow "If data is lost or wrong" in [operations](backend-operations.md). |
| Health/monitor | Create the uptime monitor on the staging URL with the Bearer header; confirm it alerts when the secret is wrong. |
| CI | First push: the `ci.yml` run is green on GitHub (including the database tests on Linux). |

Also re-run `npm audit --omit=dev` and review the dev-only ESLint advisories before release.

## 4. Production release (owner approves each line)

1. **Push** the branch (explain: pushing triggers CI and, if the repo is linked to Vercel, a preview build; merging to `main` deploys production automatically).
2. Create the production Supabase project, apply migrations, add owner and staff.
3. Vercel Production scope only: `SUPABASE_URL`, `SUPABASE_SECRET_KEY`, `RESEND_API_KEY`, `CONTACT_FROM_EMAIL` (verified domain), `CONTACT_TO_EMAIL`, `CRON_SECRET`, `RESEND_WEBHOOK_SECRET`. Leave `RETENTION_ENABLED` unset for the first week, then set `1`.
4. Create the Resend webhook pointing to `https://<site>/api/webhooks/resend`.
5. Deploy. Create the production uptime monitor on `/api/health`.
6. **Live email (owner)**: send one real test inquiry from the live form and confirm it arrives at the staff address. Do not book a real table via OpenTable.
7. Watch `/api/health` and the staff inbox for a day.

## Rollback and reconciliation

| Problem | Do |
| --- | --- |
| Bad deploy | In Vercel, promote the previous deployment (instant). Database migrations are additive; do not undo them. |
| Bad content or photo | Staff: roll back to the previous version in `/admin/content` (no deploy). |
| Emails not sending | Remove `RESEND_API_KEY` or the cron entry to pause; jobs wait safely. Fix, restore, watch health. Guests are told to call if storage is down. |
| Data loss | "If data is lost or wrong" in [operations](backend-operations.md): pause worker, restore into a new project, reconcile `leased`/`uncertain` jobs against Resend's log, then switch. |
| Staff account misuse | Delete the member row (SQL, see B06 docs) and revoke the user in Supabase Auth. |

## Known limits to tell the owner

No MFA or forgot-password form, roles changed by SQL only, no inbox kind filter, no photo reordering, the build fails if storage is configured but unreachable, backups lose up to a day (PITR is an optional $100/month). Full list in `supabase/README.md`.
