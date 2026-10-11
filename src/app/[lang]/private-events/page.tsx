import type { Metadata } from "next";

import { priceRange, PrivateEventsView } from "@/components/private-events/private-events-view";
import { getSiteContent } from "@/lib/server/content/content";
import { getDictionary } from "@/lib/i18n/dictionary";
import { getLocale } from "@/lib/i18n/get-locale";
import { pageMetadata } from "@/lib/metadata";

export async function generateMetadata(): Promise<Metadata> {
  const locale = await getLocale();
  const t = getDictionary(locale).meta;
  const { lowest, highest } = priceRange((await getSiteContent()).packages);
  return pageMetadata({
    locale,
    title: t.eventsTitle(lowest, highest),
    description: t.eventsDescription(lowest, highest),
    path: "/private-events",
  });
}

export default async function PrivateEventsPage() {
  return <PrivateEventsView tiers={(await getSiteContent()).packages} />;
}
