import type { Metadata } from "next";

import { MenuView } from "@/components/menu/menu-view";
import { getSiteContent } from "@/lib/server/content/content";
import { pageMetadata } from "@/lib/metadata";

export async function generateMetadata(): Promise<Metadata> {
  const { lunchSpecialPrice } = await getSiteContent();
  return pageMetadata({
    title: `Seafood & Russian Menu, $${lunchSpecialPrice} Lunch`,
    description: `Seafood, salads, soups, dough dishes, kebabs, and entrées, plus the three-course $${lunchSpecialPrice} weekday lunch special at Château Capitaine in Brooklyn.`,
    path: "/menu",
  });
}

export default async function MenuPage() {
  return <MenuView content={await getSiteContent()} />;
}
