import { PlaceholderImage } from "@/components/ui/placeholder-image";
import type { Photo } from "@/lib/data/gallery";

export function PhotoGrid({ photos }: { photos: Photo[] }) {
  return (
    <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {photos.map((photo) => (
        <li
          key={photo.id}
          className={photo.feature ? "sm:col-span-2" : undefined}
        >
          <figure>
            <PlaceholderImage
              label={photo.alt}
              aspect={photo.aspect}
              src={photo.src}
            />
            {photo.caption ? (
              <figcaption className="mt-3 text-sm leading-6 text-ivory-muted">
                {photo.caption}
              </figcaption>
            ) : null}
          </figure>
        </li>
      ))}
    </ul>
  );
}
