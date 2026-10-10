import type { Metadata } from "next";

import { priceRange, PrivateEventsView } from "@/components/private-events/private-events-view";
import { getSiteContent } from "@/lib/server/content/content";
import { pageMetadata } from "@/lib/metadata";

export async function generateMetadata(): Promise<Metadata> {
  const { lowest, highest } = priceRange((await getSiteContent()).packages);
  return pageMetadata({
    title: `Banquet Hall in Brooklyn, $${lowest} to $${highest}`,
    description: `All-inclusive Russian-style banquets in private rooms on Coney Island Ave, Brooklyn. Birthdays, memorials, christenings. $${lowest} to $${highest} per person.`,
    path: "/private-events",
  });
}

export default async function PrivateEventsPage() {
  return <PrivateEventsView tiers={(await getSiteContent()).packages} />;
}
