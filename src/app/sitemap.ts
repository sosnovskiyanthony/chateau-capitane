import type { MetadataRoute } from "next";

import { hasGalleryPhotos } from "@/lib/data/gallery";
import { footerLinks, navLinks, site } from "@/lib/data/site";

export default function sitemap(): MetadataRoute.Sitemap {
  // Matches the gallery's noindex until real photos exist.
  const links = [...navLinks, ...footerLinks].filter(
    (link) => link.href !== "/gallery" || hasGalleryPhotos(),
  );

  return [
    { url: site.url, changeFrequency: "monthly", priority: 1 },
    ...links.map((link) => ({
      url: `${site.url}${link.href}`,
      changeFrequency: "monthly" as const,
      priority: link.href === "/menu" ? 0.9 : 0.7,
    })),
  ];
}
