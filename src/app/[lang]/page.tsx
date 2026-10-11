import type { Metadata } from "next";

import { ContactInfo } from "@/components/contact/contact-info";
import { Hero } from "@/components/home/hero";
import { LunchSpecial } from "@/components/home/lunch-special";
import { PrivateEventsTeaser } from "@/components/home/private-events-teaser";
import { SignatureDishes } from "@/components/home/signature-dishes";
import { Container } from "@/components/layout/container";
import { RestaurantSchema } from "@/components/restaurant-schema";
import { SectionHeading } from "@/components/ui/section-heading";
import { formatHours } from "@/lib/data/site";
import { getDictionary } from "@/lib/i18n/dictionary";
import { getLocale } from "@/lib/i18n/get-locale";
import { pageMetadata } from "@/lib/metadata";
import { getSiteContent } from "@/lib/server/content/content";

export async function generateMetadata(): Promise<Metadata> {
  const locale = await getLocale();
  const { hours, lunchSpecialPrice } = await getSiteContent();
  return pageMetadata({
    locale,
    description: getDictionary(locale).meta.homeDescription(lunchSpecialPrice, formatHours(hours.lunchSpecial, locale)),
    path: "/",
  });
}

export default async function Home() {
  const t = getDictionary(await getLocale()).home.visit;
  return (
    <>
      <RestaurantSchema />
      <Hero />
      <LunchSpecial />
      <SignatureDishes />
      <PrivateEventsTeaser />

      <section>
        <Container className="grid gap-12 py-20 md:grid-cols-12 md:py-24">
          <SectionHeading
            eyebrow={t.eyebrow}
            intro={t.intro}
            className="md:col-span-5"
          >
            {t.title}
          </SectionHeading>
          <ContactInfo className="md:col-span-6 md:col-start-7" />
        </Container>
      </section>
    </>
  );
}
