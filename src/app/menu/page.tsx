import type { Metadata } from "next";

import { MenuView } from "@/components/menu/menu-view";
import { formatHours } from "@/lib/data/site";
import { getSiteContent } from "@/lib/server/content/content";
import { pageMetadata } from "@/lib/metadata";

export async function generateMetadata(): Promise<Metadata> {
  const { hours, lunchSpecialPrice } = await getSiteContent();
  return pageMetadata({
    title: "Brooklyn Seafood & Russian Menu",
    description: `Oysters, red caviar, smoked sturgeon, pelmeni, borscht and grilled meats. Brooklyn menu with prices and a $${lunchSpecialPrice} three-course lunch, ${formatHours(hours.lunchSpecial)}.`,
    path: "/menu",
  });
}

export default async function MenuPage() {
  return <MenuView content={await getSiteContent()} />;
}
