/**
 * Stand-in for photography that doesn't exist yet. Holds the exact aspect ratio
 * the real image will occupy, so swapping this for `next/image` later is a
 * one-component change with no layout shift.
 */
export function PlaceholderImage({
  label,
  aspect = "aspect-4/3",
  className = "",
}: {
  /** Describes the photo that belongs here — becomes the alt text on swap. */
  label: string;
  aspect?: string;
  className?: string;
}) {
  return (
    <div
      role="img"
      aria-label={`Placeholder — ${label}`}
      className={`flex items-end bg-stone-200 ${aspect} ${className}`}
    >
      <span className="p-4 text-xs text-stone-500">{label}</span>
    </div>
  );
}
