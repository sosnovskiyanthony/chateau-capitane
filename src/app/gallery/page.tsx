import type { Metadata } from "next";

import { GalleryView } from "@/components/gallery/gallery-view";
import { hasGalleryPhotos } from "@/lib/data/gallery";
import { getSiteContent } from "@/lib/server/content/content";
import { pageMetadata } from "@/lib/metadata";

export async function generateMetadata(): Promise<Metadata> {
  const { gallery } = await getSiteContent();
  return {
    ...pageMetadata({
      title: "Gallery",
      description:
        "Photographs of the dining room, the private banquet rooms, and the food at Château Capitaine in Brooklyn.",
      path: "/gallery",
    }),
    // Kept out of search until real photos replace the placeholders.
    ...(hasGalleryPhotos(gallery) ? {} : { robots: { index: false, follow: true } }),
  };
}

export default async function GalleryPage() {
  return <GalleryView groups={(await getSiteContent()).gallery} />;
}
