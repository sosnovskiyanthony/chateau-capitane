import Link from "next/link";

import { Container } from "@/components/layout/container";
import { MobileNavToggle } from "@/components/layout/mobile-nav-toggle";
import { navLinks, site } from "@/lib/data/site";

export function Header() {
  return (
    <header className="sticky top-0 z-50 border-b border-stone-200 bg-stone-50/95 backdrop-blur">
      <Container>
        <div className="flex h-16 items-center justify-between gap-6">
          <Link
            href="/"
            className="font-serif text-xl tracking-tight text-stone-900 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-wine-700"
          >
            {site.name}
          </Link>

          <nav aria-label="Main" className="hidden md:block">
            <ul className="flex items-center gap-7">
              {navLinks.map((link) => (
                <li key={link.href}>
                  <Link
                    href={link.href}
                    className="text-sm text-stone-700 underline-offset-4 hover:text-wine-700 hover:underline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-wine-700"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>

          <a
            href={site.phone.href}
            className="hidden text-sm font-medium text-wine-700 underline-offset-4 hover:underline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-wine-700 md:inline"
          >
            {site.phone.display}
          </a>

          <MobileNavToggle links={navLinks} phone={site.phone} />
        </div>
      </Container>
    </header>
  );
}
