import { contentRu } from "@/lib/i18n/content-ru";
import { en, type Dictionary } from "@/lib/i18n/en";
import type { Locale } from "@/lib/i18n/locales";
import { ru } from "@/lib/i18n/ru";

const dictionaries: Record<Locale, Dictionary> = { en, ru };

export function getDictionary(locale: Locale): Dictionary {
  return dictionaries[locale];
}

/** Menu, banquet and gallery text in the page's language; text with no translation stays in English. */
export function translateContent(locale: Locale, text: string): string {
  return locale === "ru" ? (contentRu[text] ?? text) : text;
}
