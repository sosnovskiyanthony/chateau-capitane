import Link from "next/link";
import { ctaClassName } from "@/components/ui/cta-class";
import { PageHeader } from "@/components/ui/page-header";
import { fieldClasses, labelClasses, linkClasses } from "@/components/ui/styles";
import { requireStaff } from "@/lib/server/auth/session";
import { getPersistenceConfiguration } from "@/lib/server/inquiries/persistence";
import {
  describeEvent, describeNotification, formatTime, isStatus, listInquiries, parseCursor, SEARCH_MAX, STATUS_LABELS, STATUSES,
} from "@/lib/server/inquiries/staff-inbox";

export default async function InboxPage({ searchParams }: PageProps<"/[lang]/admin/inquiries">) {
  const staff = await requireStaff("/admin/inquiries");
  const params = await searchParams;
  const status = isStatus(params.status) ? params.status : null;
  const search = typeof params.q === "string" ? Array.from(params.q.trim()).slice(0, SEARCH_MAX).join("") : "";
  const before = parseCursor(params.before);
  const configuration = getPersistenceConfiguration();
  const page = configuration ? await listInquiries(configuration, staff, { status, search, before }) : undefined;
  const query = (extra: Record<string, string>) =>
    `/admin/inquiries?${new URLSearchParams({ ...(status && { status }), ...(search && { q: search }), ...extra })}`;

  return (
    <>
      <PageHeader eyebrow="Staff" title="Inquiries" intro="Website messages and private-event requests, newest first. Reply by email or phone as usual." />
      <p className="mt-6 text-sm"><Link href="/admin" className={linkClasses}>Back to dashboard</Link></p>

      <form method="get" className="mt-10 grid gap-6 sm:grid-cols-[12rem_1fr_auto] sm:items-end" role="search">
        <div>
          <label htmlFor="status" className={labelClasses}>Status</label>
          <select id="status" name="status" defaultValue={status ?? ""} className={fieldClasses}>
            <option value="">All</option>
            {STATUSES.map((value) => <option key={value} value={value}>{STATUS_LABELS[value]}</option>)}
          </select>
        </div>
        <div>
          <label htmlFor="q" className={labelClasses}>Name or email contains</label>
          <input id="q" name="q" type="search" defaultValue={search} maxLength={SEARCH_MAX} className={fieldClasses} />
        </div>
        <button type="submit" className={ctaClassName("secondary")}>Filter</button>
      </form>

      {!page ? (
        <p role="alert" className="mt-10 text-ivory-muted">The inbox is unavailable right now. Please try again shortly.</p>
      ) : page.rows.length === 0 ? (
        <p className="mt-10 text-ivory-muted">No inquiries match.</p>
      ) : (
        <ul className="mt-10 divide-y divide-ivory/15 border-y border-ivory/15">
          {page.rows.map((row) => {
            const notification = describeNotification(row.notification);
            const event = describeEvent(row);
            return (
              <li key={row.id} className="py-5">
                <div className="flex flex-wrap items-baseline justify-between gap-x-6 gap-y-1">
                  <Link href={`/admin/inquiries/${row.id}`} className={`font-serif text-2xl text-ivory ${linkClasses}`}>
                    {row.name}
                  </Link>
                  <span className="text-xs font-semibold uppercase tracking-caps text-gold">{STATUS_LABELS[row.status]}</span>
                </div>
                {event ? <p className="mt-2 break-words text-sm text-ivory">{event}</p> : null}
                <p className="mt-2 break-words text-sm text-ivory-muted">
                  {row.email} · Received {formatTime(row.createdAt)}
                  {row.requestedDate ? ` · For ${row.requestedDate}` : ""}
                  {row.guests ? ` · ${row.guests} guests` : ""}
                </p>
                <p className={`mt-1 text-sm ${notification.problem ? "font-semibold text-gold-bright" : "text-ivory-muted"}`}>
                  {notification.problem ? "Attention: " : ""}{notification.label}
                </p>
              </li>
            );
          })}
        </ul>
      )}

      <nav aria-label="Pages" className="mt-8 flex flex-wrap gap-4">
        {before ? <Link href={query({})} className={ctaClassName("secondary")}>Newest</Link> : null}
        {page?.older ? <Link href={query({ before: page.older })} className={ctaClassName("secondary")}>Older</Link> : null}
      </nav>
    </>
  );
}
