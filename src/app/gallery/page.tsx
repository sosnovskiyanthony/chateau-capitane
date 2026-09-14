import type { Metadata } from "next";

import { PhotoGrid } from "@/components/gallery/photo-grid";
import { Container } from "@/components/layout/container";
import { CtaLink } from "@/components/ui/cta-link";
import { getPhotoGroups, hasGalleryPhotos } from "@/lib/data/gallery";
import { site } from "@/lib/data/site";
import { pageMetadata } from "@/lib/metadata";

export const metadata: Metadata = {
  ...pageMetadata({
    title: "Gallery",
    description:
      "Photographs of the dining room, the private banquet rooms, and the food at Château Capitaine in Brooklyn.",
    path: "/gallery",
  }),
  // Kept out of search until real photos replace the placeholders.
  ...(hasGalleryPhotos() ? {} : { robots: { index: false, follow: true } }),
};

export default function GalleryPage() {
  const groups = getPhotoGroups();

  return (
    <Container className="py-16 md:py-20">
      <header className="max-w-2xl">
        <h1 className="font-serif text-4xl text-stone-900 sm:text-5xl">
          Gallery
        </h1>
        <p className="mt-6 text-lg leading-8 text-stone-600">
          The rooms, the tables we set for parties, and what comes out of the
          kitchen.
        </p>
      </header>

      <div className="mt-14 space-y-16">
        {groups.map((group) => (
          <section key={group.id} id={group.id}>
            <h2 className="font-serif text-2xl text-stone-900 sm:text-3xl">
              {group.name}
            </h2>
            {group.description ? (
              <p className="mt-3 max-w-prose leading-7 text-stone-600">
                {group.description}
              </p>
            ) : null}
            <div className="mt-8">
              <PhotoGrid photos={group.photos} />
            </div>
          </section>
        ))}
      </div>

      <div className="mt-16 flex flex-wrap gap-3">
        <CtaLink href="/private-events">Banquet menus</CtaLink>
        <CtaLink href={site.phone.href} variant="secondary">
          Call {site.phone.display}
        </CtaLink>
      </div>
    </Container>
  );
}
