import { PhotoGrid } from "@/components/gallery/photo-grid";
import { Container } from "@/components/layout/container";
import { CallCta } from "@/components/ui/call-cta";
import { CtaLink } from "@/components/ui/cta-link";
import { PageHeader } from "@/components/ui/page-header";
import type { PhotoGroup } from "@/lib/data/gallery";

/** The gallery page body, shared by the public page and the staff preview. */
export function GalleryView({ groups }: { groups: PhotoGroup[] }) {
  return (
    <Container className="pb-20 pt-14 md:pb-28 md:pt-20">
      <PageHeader
        eyebrow="Photographs"
        title="Gallery"
        intro="The rooms, the tables we set for parties, and what comes out of the kitchen."
      />

      <div className="mt-16 space-y-20 md:mt-20 md:space-y-24">
        {groups.map((group) => (
          <section key={group.id} id={group.id}>
            <h2 className="font-serif text-3xl leading-tight tracking-tight text-ivory sm:text-4xl">
              {group.name}
            </h2>
            {group.description ? (
              <p className="mt-3 max-w-prose leading-7 text-ivory-muted">
                {group.description}
              </p>
            ) : null}
            <div className="mt-8">
              <PhotoGrid photos={group.photos} />
            </div>
          </section>
        ))}
      </div>

      <div className="mt-20 flex flex-wrap gap-3 md:mt-24">
        <CtaLink href="/private-events">See banquet menus</CtaLink>
        <CallCta variant="secondary" />
      </div>
    </Container>
  );
}
