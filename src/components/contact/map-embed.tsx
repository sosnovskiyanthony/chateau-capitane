import { site } from "@/lib/data/site";

export function MapEmbed() {
  return (
    <iframe
      src={site.mapEmbedUrl}
      title={`Map showing ${site.name} at ${site.address.full}`}
      loading="lazy"
      referrerPolicy="no-referrer-when-downgrade"
      // Sits inside an ink-800 card, so the darker ground reads as an inset until the map loads.
      className="aspect-4/3 w-full bg-ink-900"
    />
  );
}
