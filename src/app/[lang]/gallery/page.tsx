import type { Metadata } from "next";

import { GalleryView } from "@/components/gallery/gallery-view";
import { hasGalleryPhotos } from "@/lib/data/gallery";
import { getSiteContent } from "@/lib/server/content/content";
import { getDictionary } from "@/lib/i18n/dictionary";
import { getLocale } from "@/lib/i18n/get-locale";
import { pageMetadata } from "@/lib/metadata";

export async function generateMetadata(): Promise<Metadata> {
  const locale = await getLocale();
  const t = getDictionary(locale).meta;
  const { gallery } = await getSiteContent();
  return {
    ...pageMetadata({
      locale,
      title: t.galleryTitle,
      description: t.galleryDescription,
      path: "/gallery",
    }),
    // Kept out of search until real photos replace the placeholders.
    ...(hasGalleryPhotos(gallery) ? {} : { robots: { index: false, follow: true } }),
  };
}

export default async function GalleryPage() {
  return <GalleryView groups={(await getSiteContent()).gallery} />;
}
