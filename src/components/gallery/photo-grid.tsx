import { PlaceholderImage } from "@/components/ui/placeholder-image";
import type { Photo } from "@/lib/data/gallery";
import { translateContent } from "@/lib/i18n/dictionary";
import type { Locale } from "@/lib/i18n/locales";

export function PhotoGrid({ photos, locale }: { photos: Photo[]; locale: Locale }) {
  return (
    <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {photos.map((photo) => (
        <li
          key={photo.id}
          className={photo.feature ? "sm:col-span-2" : undefined}
        >
          <figure>
            <PlaceholderImage
              label={translateContent(locale, photo.alt)}
              aspect={photo.aspect}
              src={photo.src}
            />
            {photo.caption ? (
              <figcaption className="mt-3 text-sm leading-6 text-ivory-muted">
                {translateContent(locale, photo.caption)}
              </figcaption>
            ) : null}
          </figure>
        </li>
      ))}
    </ul>
  );
}
