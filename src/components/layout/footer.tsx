import Link from "next/link";

import { Container } from "@/components/layout/container";
import { Eyebrow } from "@/components/ui/eyebrow";
import { LogoMark } from "@/components/ui/logo-mark";
import { footerLinks, formatHours, navLinks, site } from "@/lib/data/site";

const socialLinks = [
  { href: site.social.facebook, label: "Facebook" },
  { href: site.social.instagram, label: "Instagram" },
  { href: site.social.yelp, label: "Yelp" },
];

const linkClasses =
  "inline-flex min-h-9 items-center text-ivory-muted transition-colors hover:text-gold focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gold";

export function Footer() {
  return (
    <footer className="border-t border-gold/20 bg-ink-950">
      <Container className="py-16 md:py-20">
        <div className="grid gap-12 sm:grid-cols-2 lg:grid-cols-12">
          <div className="lg:col-span-5">
            <LogoMark className="h-16 w-auto text-gold" />
            <p
              translate="no"
              className="mt-5 font-serif text-xl uppercase tracking-caps text-ivory"
            >
              {site.name}
            </p>
            <address className="mt-5 text-sm not-italic leading-6 text-ivory-muted">
              <span className="block">{site.address.street}</span>
              <span className="block">
                {site.address.city}, {site.address.state} {site.address.zip}
              </span>
            </address>
            <a
              href={site.phone.href}
              className="mt-2 inline-flex min-h-11 items-center font-semibold tabular-nums text-gold transition-colors hover:text-gold-bright focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gold"
            >
              {site.phone.display}
            </a>
          </div>

          <div className="lg:col-span-3">
            <Eyebrow as="h2">Hours</Eyebrow>
            <dl className="mt-5 space-y-3 text-sm leading-6 text-ivory-muted">
              <div>
                <dt className="text-ivory">Dining</dt>
                <dd>{formatHours(site.hours.dining)}</dd>
              </div>
              <div>
                <dt className="text-ivory">Lunch special</dt>
                <dd>{formatHours(site.hours.lunchSpecial)}</dd>
              </div>
            </dl>
          </div>

          <nav aria-label="Footer" className="sm:col-span-2 lg:col-span-4">
            <Eyebrow as="h2">Explore</Eyebrow>
            <ul className="mt-4 grid grid-cols-2 gap-x-6 text-sm">
              {[...navLinks, ...footerLinks].map((link) => (
                <li key={link.href}>
                  <Link href={link.href} className={linkClasses}>
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>
        </div>

        <div className="mt-14 flex flex-col gap-4 border-t border-ivory/10 pt-6 sm:flex-row sm:items-center sm:justify-between">
          <ul className="flex gap-6 text-sm">
            {socialLinks.map((link) => (
              <li key={link.label}>
                <a
                  href={link.href}
                  target="_blank"
                  rel="noreferrer"
                  className={linkClasses}
                >
                  {link.label}
                </a>
              </li>
            ))}
          </ul>
          <p className="text-sm text-ivory-muted">
            © {new Date().getFullYear()} {site.name}
          </p>
        </div>
      </Container>
    </footer>
  );
}
