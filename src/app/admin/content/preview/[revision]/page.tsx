import Link from "next/link";
import { notFound } from "next/navigation";
import { GalleryView } from "@/components/gallery/gallery-view";
import { MenuView } from "@/components/menu/menu-view";
import { PrivateEventsView } from "@/components/private-events/private-events-view";
import { PageHeader } from "@/components/ui/page-header";
import { requireStaff } from "@/lib/server/auth/session";
import { getRevision } from "@/lib/server/content/content";
import { ContentError, toSiteContent, validateDocument } from "@/lib/server/content/document";
import { formatHours } from "@/lib/data/site";
import { getPersistenceConfiguration } from "@/lib/server/inquiries/persistence";

const linkClasses = "underline decoration-gold/60 underline-offset-4 hover:text-gold-bright focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gold";

/** Staff-only preview of any saved version, using the same page bodies as the public site. */
export default async function PreviewPage({ params, searchParams }: PageProps<"/admin/content/preview/[revision]">) {
  const { revision } = await params;
  if (!/^\d{1,15}$/.test(revision)) notFound();
  const staff = await requireStaff(`/admin/content/preview/${revision}`);
  const { view } = await searchParams;
  const configuration = getPersistenceConfiguration();
  const stored = configuration ? await getRevision(configuration, staff, Number(revision)) : undefined;
  if (stored === null) notFound();
  let content;
  try { content = stored ? toSiteContent(validateDocument(stored.document)) : undefined; }
  catch (error) { if (!(error instanceof ContentError)) throw error; }
  const tabs = [{ id: "menu", label: "Menu" }, { id: "events", label: "Private events" }, { id: "gallery", label: "Gallery" }, { id: "hours", label: "Hours" }];
  const current = tabs.some((tab) => tab.id === view) ? view : "menu";

  return (
    <>
      <PageHeader eyebrow="Staff · Preview, not public" title={`Version ${revision}`} />
      <nav aria-label="Preview pages" className="mt-6 flex flex-wrap gap-x-6 gap-y-2 text-sm">
        <Link href="/admin/content" className={`inline-flex min-h-11 items-center ${linkClasses}`}>Back to website content</Link>
        {tabs.map((tab) => (
          <Link key={tab.id} href={`/admin/content/preview/${revision}?view=${tab.id}`}
            aria-current={tab.id === current ? "page" : undefined}
            className={`inline-flex min-h-11 items-center ${linkClasses} aria-[current=page]:text-gold-bright aria-[current=page]:no-underline`}>
            {tab.label}
          </Link>
        ))}
      </nav>
      {!content ? (
        <p role="alert" className="mt-10 text-ivory-muted">
          {stored ? "This version does not pass the current checks and cannot be previewed or published." : "The preview is unavailable right now. Please try again shortly."}
        </p>
      ) : (
        <div className="mt-10 border border-dashed border-gold/50">
          {current === "menu" ? <MenuView content={content} />
            : current === "events" ? <PrivateEventsView tiers={content.packages} />
              : current === "gallery" ? (
                // Staff-only copies of the photos, so unpublished uploads can be previewed.
                <GalleryView groups={content.gallery.map((group) => ({ ...group, photos: group.photos.map((photo) => (
                  { ...photo, src: photo.src?.replace(/^\/media\//, "/admin/media/") })) }))} />
              ) : (
                <dl className="grid gap-4 p-6 text-ivory sm:grid-cols-[11rem_1fr]">
                  <dt className="text-xs font-semibold uppercase tracking-caps text-ivory-muted sm:pt-1">Dining</dt>
                  <dd>{formatHours(content.hours.dining)}</dd>
                  <dt className="text-xs font-semibold uppercase tracking-caps text-ivory-muted sm:pt-1">Lunch special</dt>
                  <dd>{formatHours(content.hours.lunchSpecial)}, ${content.lunchSpecialPrice}</dd>
                </dl>
              )}
        </div>
      )}
    </>
  );
}
