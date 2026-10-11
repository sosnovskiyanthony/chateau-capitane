export const locales = ["en", "ru"] as const;
export type Locale = (typeof locales)[number];

/** English lives at the site root; Russian lives under /ru (see src/proxy.ts). */
export const defaultLocale: Locale = "en";

export function hasLocale(value: string): value is Locale {
  return (locales as readonly string[]).includes(value);
}

/** An internal link ("/menu", "/contact?event=kids", "/") in the given language. */
export function localePath(locale: Locale, href: string): string {
  if (locale === defaultLocale || !href.startsWith("/")) return href;
  return href === "/" ? `/${locale}` : `/${locale}${href}`;
}

/**
 * The path without a language prefix: "/ru/menu" -> "/menu", "/ru" -> "/". English is stripped too, because
 * the proxy rewrites "/menu" to "/en/menu" and the pathname a component sees can be either form.
 */
export function stripLocale(pathname: string): string {
  for (const locale of locales) {
    if (pathname === `/${locale}`) return "/";
    if (pathname.startsWith(`/${locale}/`)) return pathname.slice(locale.length + 1);
  }
  return pathname;
}
