/**
 * Jump links for a long page. A sticky strip under the header on small screens
 * (paired with `scroll-mt-16` on targets, on top of the header's scroll-padding
 * in globals.css), a sticky sidebar from `lg` up (paired with `lg:scroll-mt-4`).
 */
export function SectionIndex({
  label,
  items,
  className = "",
}: {
  label: string;
  items: { id: string; label: string }[];
  className?: string;
}) {
  return (
    <div
      className={`sticky top-16 z-30 -mx-6 border-b border-gold/20 bg-ink-900 px-6 sm:-mx-8 sm:px-8 lg:top-24 lg:mx-0 lg:self-start lg:border-0 lg:bg-transparent lg:px-0 ${className}`}
    >
      <nav aria-label={label}>
        <ul className="flex gap-x-6 overflow-x-auto lg:max-h-[calc(100dvh-7rem)] lg:flex-col lg:overflow-y-auto">
          {items.map((item) => (
            <li key={item.id} className="shrink-0">
              <a
                href={`#${item.id}`}
                className="inline-flex min-h-11 items-center whitespace-nowrap text-sm text-ivory-muted transition-colors hover:text-gold focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-gold lg:min-h-9 lg:whitespace-normal"
              >
                {item.label}
              </a>
            </li>
          ))}
        </ul>
      </nav>
    </div>
  );
}
