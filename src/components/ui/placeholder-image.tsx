import Image from "next/image";

/**
 * A photo slot. Renders the real photo once `src` is set; until then, holds
 * the exact aspect ratio the photo will occupy so nothing shifts when it
 * arrives.
 */
export function PlaceholderImage({
  label,
  aspect = "aspect-4/3",
  className = "",
  src,
  priority = false,
}: {
  /** Describes the photo that belongs here; becomes the alt text once `src` is set. */
  label: string;
  aspect?: string;
  className?: string;
  src?: string;
  /** For a photo large enough to be the page's LCP element, e.g. a hero or a featured card. */
  priority?: boolean;
}) {
  if (src) {
    return (
      <Image
        src={src}
        alt={label}
        width={1200}
        height={900}
        priority={priority}
        // The optimizer fetches without cookies, so staff-only previews are served as they are.
        unoptimized={src.startsWith("/admin/")}
        className={`w-full object-cover ${aspect} ${className}`}
      />
    );
  }

  return (
    <div
      role="img"
      aria-label={`Photo to come: ${label}`}
      className={`relative flex items-end bg-ink-800 ${aspect} ${className}`}
    >
      <span
        aria-hidden="true"
        className="pointer-events-none absolute inset-3 border border-gold/20"
      />
      <span className="relative p-6 text-xs leading-5 text-ivory-muted">
        {label}
      </span>
    </div>
  );
}
