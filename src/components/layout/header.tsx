import Link from "next/link";

import { Container } from "@/components/layout/container";
import { MobileNavToggle } from "@/components/layout/mobile-nav-toggle";
import { NavLinks } from "@/components/layout/nav-links";
import { LogoMark } from "@/components/ui/logo-mark";
import { BookCta } from "@/components/ui/book-cta";
import { focusRing } from "@/components/ui/styles";
import { navLinks, site } from "@/lib/data/site";

const [firstWord, ...restWords] = site.name.split(" ");

export function Header() {
  return (
    <header className="sticky top-0 z-40 border-b border-gold/25 bg-ink-900/90 backdrop-blur-md">
      <Container>
        <div className="flex h-16 items-center justify-between gap-4 lg:h-20">
          <Link
            href="/"
            translate="no"
            className={`flex items-center gap-3 font-serif text-sm uppercase tracking-caps text-ivory sm:text-lg ${focusRing}`}
          >
            <LogoMark className="h-10 w-auto shrink-0 text-gold lg:h-12" />
            {/* Two lines below xs, where one line plus the mark can't fit beside Call and the menu button. */}
            <span className="leading-tight">
              <span className="block whitespace-nowrap xs:inline">
                {firstWord}
              </span>{" "}
              <span className="block whitespace-nowrap xs:inline">
                {restWords.join(" ")}
              </span>
            </span>
          </Link>

          <NavLinks links={navLinks} />

          <div className="hidden items-center gap-4 lg:flex">
            <a
              href={site.phone.href}
              aria-label={`Call ${site.phone.display}`}
              className={`inline-flex min-h-11 items-center whitespace-nowrap text-sm font-semibold text-gold ${focusRing}`}
            >
              <span className="xl:hidden">Call</span>
              <span className="hidden xl:inline">{site.phone.display}</span>
            </a>
            <BookCta className="px-4" />
          </div>

          <div className="flex items-center gap-1 lg:hidden">
            <a
              href={site.phone.href}
              aria-label={`Call ${site.phone.display}`}
              className={`inline-flex min-h-11 items-center whitespace-nowrap px-2 text-xs font-semibold uppercase tracking-caps text-gold ${focusRing}`}
            >
              Call
            </a>
            <MobileNavToggle links={navLinks} phone={site.phone} />
          </div>
        </div>
      </Container>
    </header>
  );
}
