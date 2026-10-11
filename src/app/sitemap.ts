import type { MetadataRoute } from "next";

import { hasGalleryPhotos } from "@/lib/data/gallery";
import { getLayoutContent } from "@/lib/server/content/content";
import { footerLinks, navLinks, site } from "@/lib/data/site";
import { localePath, locales } from "@/lib/i18n/locales";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const { gallery } = await getLayoutContent();
  // Matches the gallery's noindex until real photos exist.
  const links = [...navLinks, ...footerLinks].filter(
    (link) => link.href !== "/gallery" || hasGalleryPhotos(gallery),
  );

  const paths = ["/", ...links.map((link) => link.href)];

  // One entry per language, each listing the other as its alternate.
  return paths.flatMap((path) =>
    locales.map((locale) => ({
      url: `${site.url}${localePath(locale, path) === "/" ? "" : localePath(locale, path)}`,
      changeFrequency: "monthly" as const,
      priority: path === "/" ? 1 : path === "/menu" ? 0.9 : 0.7,
      alternates: {
        languages: Object.fromEntries(
          locales.map((code) => [code, `${site.url}${localePath(code, path) === "/" ? "" : localePath(code, path)}`]),
        ),
      },
    })),
  );
}
