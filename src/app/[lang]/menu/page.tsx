import type { Metadata } from "next";

import { MenuView } from "@/components/menu/menu-view";
import { formatHours } from "@/lib/data/site";
import { getSiteContent } from "@/lib/server/content/content";
import { getDictionary } from "@/lib/i18n/dictionary";
import { getLocale } from "@/lib/i18n/get-locale";
import { pageMetadata } from "@/lib/metadata";

export async function generateMetadata(): Promise<Metadata> {
  const locale = await getLocale();
  const t = getDictionary(locale).meta;
  const { hours, lunchSpecialPrice } = await getSiteContent();
  return pageMetadata({
    locale,
    title: t.menuTitle,
    description: t.menuDescription(lunchSpecialPrice, formatHours(hours.lunchSpecial, locale)),
    path: "/menu",
  });
}

export default async function MenuPage() {
  return <MenuView content={await getSiteContent()} />;
}
