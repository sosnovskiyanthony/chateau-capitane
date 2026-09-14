import { site } from "@/lib/data/site";

export function MapEmbed() {
  return (
    <iframe
      src={site.mapEmbedUrl}
      title={`Map showing ${site.name} at ${site.address.full}`}
      loading="lazy"
      referrerPolicy="no-referrer-when-downgrade"
      className="aspect-4/3 w-full border border-stone-300"
    />
  );
}
