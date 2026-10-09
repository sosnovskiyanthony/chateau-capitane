import { Eyebrow } from "@/components/ui/eyebrow";
import { formatHours, site } from "@/lib/data/site";

const linkClasses =
  "mt-4 inline-flex min-h-11 items-center font-semibold text-gold transition-colors hover:text-gold-bright focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gold";

export function ContactInfo({
  columns = 2,
  className = "",
}: {
  columns?: 1 | 2;
  className?: string;
}) {
  return (
    <div
      className={`grid gap-10 ${columns === 2 ? "sm:grid-cols-2" : ""} ${className}`}
    >
      <div>
        <Eyebrow as="h3">Find us</Eyebrow>
        <address className="mt-4 text-lg not-italic leading-8 text-ivory">
          <span className="block">{site.address.street}</span>
          <span className="block">
            {site.address.city}, {site.address.state} {site.address.zip}
          </span>
        </address>
        <a
          href={site.mapLinkUrl}
          target="_blank"
          rel="noreferrer"
          className={linkClasses}
        >
          Get directions
        </a>
      </div>

      <div>
        <Eyebrow as="h3">Hours</Eyebrow>
        <dl className="mt-4 space-y-4 leading-7 text-ivory-muted">
          <div>
            <dt className="text-lg text-ivory">Dining</dt>
            <dd>{formatHours(site.hours.dining)}</dd>
          </div>
          <div>
            <dt className="text-lg text-ivory">Lunch special</dt>
            <dd>{formatHours(site.hours.lunchSpecial)}</dd>
          </div>
        </dl>
        <a href={site.phone.href} className={`${linkClasses} tabular-nums`}>
          {site.phone.display}
        </a>
      </div>
    </div>
  );
}
