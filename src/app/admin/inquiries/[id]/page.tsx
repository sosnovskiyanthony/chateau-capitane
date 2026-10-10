import Link from "next/link";
import { notFound } from "next/navigation";
import { addNote, changeStatus } from "@/app/admin/inquiries/actions";
import { ctaClassName } from "@/components/ui/cta-link";
import { PageHeader } from "@/components/ui/page-header";
import { linkClasses } from "@/components/ui/styles";
import { requireStaff } from "@/lib/server/auth/session";
import { getPersistenceConfiguration } from "@/lib/server/inquiries/persistence";
import {
  describeNotification, formatTime, getInquiry, isInquiryId, NOTE_MAX, STATUS_LABELS, type Status,
} from "@/lib/server/inquiries/staff-inbox";

const headingClasses = "font-serif text-3xl text-ivory";

const notices: Record<string, string> = {
  updated: "Status saved.",
  stale: "Someone else changed this inquiry while you were viewing it. Nothing was saved; check the current status below and try again.",
  invalid: "That status change is not allowed from the current status. Nothing was saved.",
  unavailable: "That could not be saved right now. Please try again shortly.",
  "note-added": "Note added.",
  "note-empty": "Write a note before adding it.",
  "note-long": `Notes can be at most ${NOTE_MAX} characters.`,
  "note-full": "This inquiry has reached the 100-note limit.",
};

// Forward moves plus explicit reopening; matches staff_set_inquiry_status.
const moves: Record<Status, { to: Status; label: string }[]> = {
  new: [{ to: "in_progress", label: "Start working on it" }, { to: "resolved", label: "Mark resolved" }],
  in_progress: [{ to: "resolved", label: "Mark resolved" }],
  resolved: [{ to: "in_progress", label: "Reopen" }],
};

export default async function InquiryPage({ params, searchParams }: PageProps<"/admin/inquiries/[id]">) {
  const { id } = await params;
  if (!isInquiryId(id)) notFound();
  const staff = await requireStaff(`/admin/inquiries/${id}`);
  const { notice } = await searchParams;
  const configuration = getPersistenceConfiguration();
  const inquiry = configuration ? await getInquiry(configuration, staff, id) : undefined;
  if (inquiry === null) notFound();
  const back = <p className="mt-6 text-sm"><Link href="/admin/inquiries" className={linkClasses}>Back to inquiries</Link></p>;
  if (!inquiry) {
    return (
      <>
        <PageHeader eyebrow="Staff" title="Inquiry" />
        <p role="alert" className="mt-10 text-ivory-muted">This inquiry is unavailable right now. Please try again shortly.</p>
        {back}
      </>
    );
  }
  const notification = describeNotification(inquiry.notification);
  const message = typeof notice === "string" ? notices[notice] : undefined;
  const details: [string, React.ReactNode][] = [
    ["Received", formatTime(inquiry.createdAt)],
    ["Email", <a key="e" href={`mailto:${inquiry.email}`} className={linkClasses}>{inquiry.email}</a>],
    ["Phone", inquiry.phone ? <a key="p" href={`tel:${inquiry.phone.replace(/[^\d+]/g, "")}`} className={linkClasses}>{inquiry.phone}</a> : "Not provided"],
    ["Kind", inquiry.kind === "event" ? "Private event" : "General message"],
    ...(inquiry.kind === "event" ? [["Package requested", inquiry.eventPackage ?? "Not chosen yet"] as [string, string]] : []),
    ["Requested date", inquiry.requestedDate ?? "Not provided"],
    ["Guests", inquiry.guests ?? "Not provided"],
    ["Staff email", <span key="n" className={notification.problem ? "font-semibold text-gold-bright" : ""}>{notification.label}</span>],
  ];

  return (
    <>
      <PageHeader eyebrow={`Inquiry · ${STATUS_LABELS[inquiry.status]}`} title={inquiry.name} />
      {back}

      <dl className="mt-10 grid max-w-3xl gap-x-8 gap-y-4 sm:grid-cols-[11rem_1fr]">
        {details.map(([term, value]) => (
          <div key={term} className="contents">
            <dt className="text-xs font-semibold uppercase tracking-caps text-ivory-muted sm:pt-1">{term}</dt>
            <dd className="break-words text-ivory">{value}</dd>
          </div>
        ))}
      </dl>

      <section aria-labelledby="message" className="mt-12 max-w-3xl">
        <h2 id="message" className={headingClasses}>Message</h2>
        <p className="mt-4 whitespace-pre-wrap break-words leading-7 text-ivory">{inquiry.message}</p>
      </section>

      <section id="actions" aria-labelledby="status" className="mt-12 max-w-3xl scroll-mt-24">
        <h2 id="status" className={headingClasses}>Status: {STATUS_LABELS[inquiry.status]}</h2>
        <p role="status" className="mt-4 min-h-6 text-sm text-gold-bright">{message}</p>
        <div className="mt-4 flex flex-wrap gap-4">
          {moves[inquiry.status].map((move) => (
            <form key={move.to} action={changeStatus}>
              <input type="hidden" name="id" value={inquiry.id} />
              <input type="hidden" name="version" value={inquiry.version} />
              <input type="hidden" name="status" value={move.to} />
              <button type="submit" className={ctaClassName(move.to === "resolved" ? "primary" : "secondary")}>{move.label}</button>
            </form>
          ))}
        </div>

        <form action={addNote} className="mt-10 grid gap-4">
          <input type="hidden" name="id" value={inquiry.id} />
          <label htmlFor="note" className="block text-xs font-semibold uppercase tracking-caps text-ivory">
            Add a note (staff only, up to {NOTE_MAX} characters)
          </label>
          <textarea id="note" name="note" required maxLength={NOTE_MAX} rows={4}
            className="w-full border border-ivory/45 bg-ink-950 px-4 py-3 text-ivory focus-visible:border-gold focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-gold" />
          <button type="submit" className={`justify-self-start ${ctaClassName("secondary")}`}>Add note</button>
        </form>
      </section>

      <section aria-labelledby="notes" className="mt-12 max-w-3xl">
        <h2 id="notes" className={headingClasses}>Notes</h2>
        {inquiry.notes.length === 0 ? <p className="mt-4 text-ivory-muted">No notes yet.</p> : (
          <ol className="mt-4 divide-y divide-ivory/15 border-y border-ivory/15">
            {inquiry.notes.map((note, i) => (
              <li key={i} className="py-4">
                <p className="text-xs text-ivory-muted">{note.author || "Staff"} · {formatTime(note.createdAt)}</p>
                <p className="mt-2 whitespace-pre-wrap break-words text-ivory">{note.body}</p>
              </li>
            ))}
          </ol>
        )}
      </section>

      <section aria-labelledby="history" className="mt-12 max-w-3xl">
        <h2 id="history" className={headingClasses}>History</h2>
        <ol className="mt-4 grid gap-2 text-sm text-ivory-muted">
          <li>{formatTime(inquiry.createdAt)} · Received from the website</li>
          {inquiry.history.map((event, i) => (
            <li key={i}>
              {formatTime(event.at)} · {STATUS_LABELS[event.from]} → {STATUS_LABELS[event.to]} by {event.actor || "staff"}
            </li>
          ))}
        </ol>
      </section>
    </>
  );
}
