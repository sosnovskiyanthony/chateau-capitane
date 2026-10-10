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
import { pageMetadata } from "@/lib/metadata";
import { getSiteContent } from "@/lib/server/content/content";

export async function generateMetadata(): Promise<Metadata> {
  const { hours, lunchSpecialPrice } = await getSiteContent();
  return pageMetadata({
    description: `Oysters, caviar, grilled fish and Russian banquets on Coney Island Ave, Brooklyn. $${lunchSpecialPrice} three-course lunch, ${formatHours(hours.lunchSpecial)}. Reserve online.`,
    path: "/",
  });
}

export default function Home() {
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
            eyebrow="Hours & location"
            intro="Open Wednesday through Sunday. Call ahead for larger parties."
            className="md:col-span-5"
          >
            Visit us
          </SectionHeading>
          <ContactInfo className="md:col-span-6 md:col-start-7" />
        </Container>
      </section>
    </>
  );
}
