import { getDictionary } from "@/lib/i18n/dictionary";
import { localePath, type Locale } from "@/lib/i18n/locales";
import { footerLinks, navLinks, type NavLink } from "@/lib/data/site";

const labels = {
  "/menu": "menu",
  "/private-events": "privateEvents",
  "/gallery": "gallery",
  "/about": "about",
  "/contact": "contact",
  "/testimonials": "testimonials",
} as const;

function localize(locale: Locale, links: readonly NavLink[]): NavLink[] {
  const t = getDictionary(locale);
  return links.map((link) => ({
    href: localePath(locale, link.href),
    label: t.nav[labels[link.href as keyof typeof labels]],
  }));
}

/** Header links and footer-only links, with addresses and labels in the page's language. */
export function localizedNav(locale: Locale) {
  return { main: localize(locale, navLinks), footer: localize(locale, footerLinks) };
}
