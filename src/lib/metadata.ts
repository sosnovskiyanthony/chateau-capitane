import type { Metadata } from "next";

import { site } from "@/lib/data/site";

export const defaultTitle = `${site.name} — Brooklyn Bar & Grill`;

/** Served by `src/app/opengraph-image.tsx`. */
export const shareImage = {
  url: "/opengraph-image",
  width: 1200,
  height: 630,
  alt: `${site.name} — seafood and Russian-style banquets on Coney Island Avenue, Brooklyn`,
};

// Next replaces a parent's `openGraph` wholesale (dropping the inherited image) and the title template skips `og:title`, so set every field here.
export function pageMetadata({
  title,
  description,
  path,
}: {
  /** Omit on the home page to keep the layout's default title. */
  title?: string;
  description: string;
  path: string;
}): Metadata {
  return {
    ...(title ? { title } : {}),
    description,
    alternates: { canonical: path },
    openGraph: {
      title: title ? `${title} | ${site.name}` : defaultTitle,
      description,
      url: path,
      siteName: site.name,
      locale: "en_US",
      type: "website",
      images: [shareImage],
    },
  };
}
