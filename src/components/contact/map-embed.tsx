import { site } from "@/lib/data/site";
import { getDictionary } from "@/lib/i18n/dictionary";
import { getLocale } from "@/lib/i18n/get-locale";

export async function MapEmbed() {
  const t = getDictionary(await getLocale());
  return (
    <iframe
      src={site.mapEmbedUrl}
      title={t.mapTitle(site.name, site.address.full)}
      loading="lazy"
      referrerPolicy="no-referrer-when-downgrade"
      // Sits inside an ink-800 card, so the darker ground reads as an inset until the map loads.
      className="aspect-4/3 w-full bg-ink-900"
    />
  );
}
