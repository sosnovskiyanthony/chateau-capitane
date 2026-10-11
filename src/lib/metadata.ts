import type { Metadata } from "next";

import { site } from "@/lib/data/site";
import { getDictionary } from "@/lib/i18n/dictionary";
import { defaultLocale, localePath, locales, type Locale } from "@/lib/i18n/locales";

/** Served by `src/app/opengraph-image.tsx`; the picture itself is the same in every language. */
export const shareImage = {
  url: "/opengraph-image",
  type: "image/png",
  width: 1200,
  height: 630,
  alt: getDictionary(defaultLocale).meta.shareAlt(site.name),
};

// Next replaces a parent's `openGraph` wholesale (dropping the inherited image) and the title template skips `og:title`, so set every field here.
export function pageMetadata({
  locale,
  title,
  description,
  path,
}: {
  locale: Locale;
  /** Omit on the home page to keep the layout's default title. */
  title?: string;
  description: string;
  /** The English path ("/menu"); each language's address and the hreflang links derive from it. */
  path: string;
}): Metadata {
  const t = getDictionary(locale);
  const fullTitle = title ? `${title} | ${site.name}` : t.meta.defaultTitle(site.name);
  return {
    ...(title ? { title } : {}),
    description,
    alternates: {
      canonical: localePath(locale, path),
      languages: {
        ...Object.fromEntries(locales.map((code) => [code, localePath(code, path)])),
        "x-default": path,
      },
    },
    openGraph: {
      title: fullTitle,
      description,
      url: localePath(locale, path),
      siteName: site.name,
      locale: t.ogLocale,
      type: "website",
      images: [{ ...shareImage, alt: t.meta.shareAlt(site.name) }],
    },
  };
}
