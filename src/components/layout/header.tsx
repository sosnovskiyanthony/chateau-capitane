import Link from "next/link";

import { Container } from "@/components/layout/container";
import { MobileNavToggle } from "@/components/layout/mobile-nav-toggle";
import { NavLinks } from "@/components/layout/nav-links";
import { LogoMark } from "@/components/ui/logo-mark";
import { BookCta } from "@/components/ui/book-cta";
import { focusRing } from "@/components/ui/styles";
import { LanguageSwitch } from "@/components/layout/language-switch";
import { site } from "@/lib/data/site";
import { getDictionary } from "@/lib/i18n/dictionary";
import { getLocale } from "@/lib/i18n/get-locale";
import { localePath } from "@/lib/i18n/locales";
import { localizedNav } from "@/lib/i18n/nav";

const [firstWord, ...restWords] = site.name.split(" ");

export async function Header() {
  const locale = await getLocale();
  const t = getDictionary(locale);
  const { main: links } = localizedNav(locale);
  return (
    <header className="sticky top-0 z-40 border-b border-gold/25 bg-ink-900/90 backdrop-blur-md">
      <Container>
        <div className="flex h-16 items-center justify-between gap-4 lg:h-20">
          <Link
            href={localePath(locale, "/")}
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

          <NavLinks links={links} label={t.aria.main} />

          <div className="hidden items-center gap-4 lg:flex">
            <LanguageSwitch other={t.otherLanguage} />
            <a
              href={site.phone.href}
              aria-label={t.header.callAria(site.phone.display)}
              className={`inline-flex min-h-11 items-center whitespace-nowrap text-sm font-semibold text-gold ${focusRing}`}
            >
              <span className="xl:hidden">{t.header.call}</span>
              <span className="hidden xl:inline">{site.phone.display}</span>
            </a>
            <BookCta className="px-4" />
          </div>

          <div className="flex items-center gap-1 lg:hidden">
            <a
              href={site.phone.href}
              aria-label={t.header.callAria(site.phone.display)}
              className={`inline-flex min-h-11 items-center whitespace-nowrap px-2 text-xs font-semibold uppercase tracking-caps text-gold ${focusRing}`}
            >
              {t.header.call}
            </a>
            <LanguageSwitch other={t.otherLanguage} />
            <MobileNavToggle
              links={links}
              phone={site.phone}
              labels={{
                open: t.aria.openMenu,
                close: t.aria.closeMenu,
                nav: t.aria.mobile,
                call: t.header.call,
              }}
              book={<BookCta className="mb-2 mt-4 w-full" />}
            />
          </div>
        </div>
      </Container>
    </header>
  );
}
