import Link from "next/link";
import { publish, restore } from "@/app/[lang]/admin/content/actions";
import { ctaClassName } from "@/components/ui/cta-class";
import { PageHeader } from "@/components/ui/page-header";
import { linkClasses } from "@/components/ui/styles";
import { requireStaff } from "@/lib/server/auth/session";
import { draftDocument, getContentState } from "@/lib/server/content/content";
import { formatTime } from "@/lib/server/inquiries/staff-inbox";
import { getPersistenceConfiguration } from "@/lib/server/inquiries/persistence";

const headingClasses = "font-serif text-3xl text-ivory";
const smallButton = "min-h-11 border border-gold/60 px-4 text-sm text-ivory hover:border-gold hover:text-gold-bright focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gold";

const notices: Record<string, string> = {
  saved: "Draft saved. It is not on the website until you publish it.",
  published: "Published. The website shows it from the next page load.",
  restored: "That version is now the draft. Publish it when ready.",
  stale: "Someone else saved changes first. Nothing was changed; check the draft below.",
  invalid: "That version does not pass the current checks, so it cannot be used. Edit the draft instead.",
  "not-found": "That version no longer exists.",
  unavailable: "That could not be done right now. Please try again shortly.",
};

export default async function ContentPage({ searchParams }: PageProps<"/[lang]/admin/content">) {
  const staff = await requireStaff("/admin/content");
  const { notice } = await searchParams;
  const configuration = getPersistenceConfiguration();
  const state = configuration ? await getContentState(configuration, staff) : undefined;
  const back = <p className="mt-6 text-sm"><Link href="/admin" className={linkClasses}>Back to dashboard</Link></p>;
  if (!state) {
    return (
      <>
        <PageHeader eyebrow="Staff" title="Website content" />
        <p role="alert" className="mt-10 text-ivory-muted">Content editing is unavailable right now. Please try again shortly.</p>
        {back}
      </>
    );
  }
  const document = draftDocument(state);
  const draft = state.draft;
  const live = state.publishedId;
  const publication = state.publications[0];
  const message = typeof notice === "string" ? notices[notice] : undefined;
  const sections = [
    { slug: "hours", label: "Hours, lunch special and dining policies" },
    ...document.menuCategories.map((category) => ({ slug: `menu-${category.id}`, label: `Menu: ${category.name}` })),
    ...document.packages.map((tier) => ({ slug: `package-${tier.id}`, label: `Banquet: ${tier.name} $${tier.pricePerPersonCents / 100}` })),
    ...document.gallery.map((group) => ({ slug: `gallery-${group.id}`, label: `Gallery: ${group.name}` })),
  ];

  return (
    <>
      <PageHeader eyebrow="Staff" title="Website content"
        intro="Edit menus, hours, banquet packages and gallery photos as a draft, preview it, then publish. The phone number, OpenTable link and lunch rules (three courses, beverages not included) are fixed." />
      {back}
      <p role="status" className="mt-6 min-h-6 text-sm text-gold-bright">{message}</p>

      <section aria-labelledby="status" className="mt-6 max-w-3xl">
        <h2 id="status" className={headingClasses}>Status</h2>
        <dl className="mt-4 grid gap-x-8 gap-y-3 sm:grid-cols-[11rem_1fr]">
          <dt className="text-xs font-semibold uppercase tracking-caps text-ivory-muted sm:pt-1">On the website</dt>
          <dd className="text-ivory">{publication
            ? `Version ${publication.revision}, published by ${publication.by} on ${formatTime(publication.at)}`
            : "The original built-in content (nothing published yet)"}</dd>
          <dt className="text-xs font-semibold uppercase tracking-caps text-ivory-muted sm:pt-1">Draft</dt>
          <dd className="text-ivory">{draft
            ? `Version ${draft.id}, saved by ${draft.author} on ${formatTime(draft.createdAt)}${draft.id === live ? " (same as the website)" : " (not published)"}`
            : "No changes yet; editing starts from the built-in content"}</dd>
        </dl>
        {draft ? (
          <div className="mt-6 flex flex-wrap gap-4">
            <Link href={`/admin/content/preview/${draft.id}`} className={ctaClassName("secondary")}>Preview draft</Link>
            {draft.id !== live ? (
              <form action={publish}>
                <input type="hidden" name="revision" value={draft.id} />
                <button type="submit" className={ctaClassName("primary")}>Publish draft</button>
              </form>
            ) : null}
          </div>
        ) : null}
      </section>

      <section aria-labelledby="sections" className="mt-12 max-w-3xl">
        <h2 id="sections" className={headingClasses}>Edit</h2>
        <ul className="mt-4 grid gap-1">
          {sections.map((section) => (
            <li key={section.slug}>
              <Link href={`/admin/content/${section.slug}`} className={`inline-flex min-h-11 items-center ${linkClasses}`}>{section.label}</Link>
            </li>
          ))}
        </ul>
      </section>

      <section aria-labelledby="history" className="mt-12 max-w-3xl">
        <h2 id="history" className={headingClasses}>Versions</h2>
        {state.revisions.length === 0 ? <p className="mt-4 text-ivory-muted">No saved versions yet.</p> : (
          <ol className="mt-4 divide-y divide-ivory/15 border-y border-ivory/15">
            {state.revisions.map((revision) => (
              <li key={revision.id} className="flex flex-wrap items-center gap-x-6 gap-y-3 py-4">
                <p className="grow text-sm text-ivory">
                  Version {revision.id}{revision.id === live ? <strong className="ml-2 text-gold-bright">On the website</strong> : null}
                  <span className="block text-ivory-muted">{revision.author} · {formatTime(revision.createdAt)}</span>
                </p>
                <Link href={`/admin/content/preview/${revision.id}`} className={`inline-flex items-center ${smallButton}`}
                  aria-label={`Preview version ${revision.id}`}>Preview</Link>
                {revision.id !== live ? (
                  <form action={publish}>
                    <input type="hidden" name="revision" value={revision.id} />
                    <button type="submit" className={smallButton} aria-label={`Publish version ${revision.id}`}>Publish</button>
                  </form>
                ) : null}
                {revision.id !== draft?.id ? (
                  <form action={restore}>
                    <input type="hidden" name="revision" value={revision.id} />
                    <input type="hidden" name="base" value={draft?.id ?? ""} />
                    <button type="submit" className={smallButton} aria-label={`Copy version ${revision.id} into the draft`}>Copy to draft</button>
                  </form>
                ) : null}
              </li>
            ))}
          </ol>
        )}
        {state.publications.length ? (
          <>
            <h3 className="mt-8 text-xs font-semibold uppercase tracking-caps text-ivory-muted">Publishing history</h3>
            <ol className="mt-3 grid gap-2 text-sm text-ivory-muted">
              {state.publications.map((entry, i) => (
                <li key={i}>{formatTime(entry.at)} · version {entry.revision} published by {entry.by}</li>
              ))}
            </ol>
          </>
        ) : null}
      </section>
    </>
  );
}
