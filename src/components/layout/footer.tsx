import Link from "next/link";

import { Container } from "@/components/layout/container";
import { footerLinks, formatHours, navLinks, site } from "@/lib/data/site";

const socialLinks = [
  { href: site.social.facebook, label: "Facebook" },
  { href: site.social.instagram, label: "Instagram" },
  { href: site.social.yelp, label: "Yelp" },
];

export function Footer() {
  return (
    <footer className="mt-24 border-t border-stone-200 bg-stone-100">
      <Container className="py-14">
        <div className="grid gap-10 sm:grid-cols-2 lg:grid-cols-3">
          <div>
            <p className="font-serif text-lg text-stone-900">{site.name}</p>
            <address className="mt-3 space-y-1 text-sm not-italic text-stone-600">
              <span className="block">{site.address.street}</span>
              <span className="block">
                {site.address.city}, {site.address.state} {site.address.zip}
              </span>
              <a
                href={site.phone.href}
                className="mt-2 inline-block text-wine-700 underline-offset-4 hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-wine-700"
              >
                {site.phone.display}
              </a>
            </address>
          </div>

          <div>
            <h2 className="font-serif text-lg text-stone-900">Hours</h2>
            <dl className="mt-3 space-y-2 text-sm text-stone-600">
              <div>
                <dt className="inline">Dining: </dt>
                <dd className="inline">{formatHours(site.hours.dining)}</dd>
              </div>
              <div>
                <dt className="inline">Lunch special: </dt>
                <dd className="inline">{formatHours(site.hours.lunchSpecial)}</dd>
              </div>
            </dl>
          </div>

          <div className="sm:col-span-2 lg:col-span-1">
            <h2 className="font-serif text-lg text-stone-900">Explore</h2>
            <ul className="mt-3 grid grid-cols-2 gap-x-6 gap-y-2 text-sm lg:grid-cols-1">
              {[...navLinks, ...footerLinks].map((link) => (
                <li key={link.href}>
                  <Link
                    href={link.href}
                    className="text-stone-600 underline-offset-4 hover:text-wine-700 hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-wine-700"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </div>

        <div className="mt-12 flex flex-col gap-4 border-t border-stone-200 pt-6 sm:flex-row sm:items-center sm:justify-between">
          <ul className="flex gap-5 text-sm">
            {socialLinks.map((link) => (
              <li key={link.label}>
                <a
                  href={link.href}
                  target="_blank"
                  rel="noreferrer"
                  className="text-stone-600 underline-offset-4 hover:text-wine-700 hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-wine-700"
                >
                  {link.label}
                </a>
              </li>
            ))}
          </ul>
          <p className="text-sm text-stone-500">
            © {new Date().getFullYear()} {site.name}
          </p>
        </div>
      </Container>
    </footer>
  );
}
