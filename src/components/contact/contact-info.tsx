import { formatHours, site } from "@/lib/data/site";

export function ContactInfo({
  columns = 2,
  className = "",
}: {
  columns?: 1 | 2;
  className?: string;
}) {
  return (
    <div
      className={`grid gap-8 ${columns === 2 ? "sm:grid-cols-2" : ""} ${className}`}
    >
      <div>
        <h3 className="font-serif text-xl text-stone-900">Find us</h3>
        <address className="mt-3 space-y-1 text-stone-600 not-italic">
          <span className="block">{site.address.street}</span>
          <span className="block">
            {site.address.city}, {site.address.state} {site.address.zip}
          </span>
        </address>
        <a
          href={site.mapLinkUrl}
          target="_blank"
          rel="noreferrer"
          className="mt-3 inline-block text-wine-700 underline-offset-4 hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-wine-700"
        >
          Get directions
        </a>
      </div>

      <div>
        <h3 className="font-serif text-xl text-stone-900">Hours</h3>
        <dl className="mt-3 space-y-2 text-stone-600">
          <div>
            <dt className="inline">Dining: </dt>
            <dd className="inline">{formatHours(site.hours.dining)}</dd>
          </div>
          <div>
            <dt className="inline">Lunch special: </dt>
            <dd className="inline">{formatHours(site.hours.lunchSpecial)}</dd>
          </div>
        </dl>
        <a
          href={site.phone.href}
          className="mt-3 inline-block text-wine-700 underline-offset-4 hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-wine-700"
        >
          {site.phone.display}
        </a>
      </div>
    </div>
  );
}
