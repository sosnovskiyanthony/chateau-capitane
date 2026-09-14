import Image from "next/image";

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
          {photo.src ? (
            <Image
              src={photo.src}
              alt={photo.alt}
              width={1200}
              height={900}
              className={`w-full object-cover ${photo.aspect}`}
            />
          ) : (
            <PlaceholderImage label={photo.alt} aspect={photo.aspect} />
          )}
        </li>
      ))}
    </ul>
  );
}
