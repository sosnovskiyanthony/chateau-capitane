import type { Metadata } from "next";

import { ContactInfo } from "@/components/contact/contact-info";
import { Hero } from "@/components/home/hero";
import { LunchSpecial } from "@/components/home/lunch-special";
import { PrivateEventsTeaser } from "@/components/home/private-events-teaser";
import { SignatureDishes } from "@/components/home/signature-dishes";
import { Container } from "@/components/layout/container";
import { RestaurantSchema } from "@/components/restaurant-schema";
import { SectionHeading } from "@/components/ui/section-heading";
import { site } from "@/lib/data/site";
import { pageMetadata } from "@/lib/metadata";

export const metadata: Metadata = pageMetadata({
  description: `${site.name}: seafood, Russian-style banquets, and a four-course $${site.lunchSpecialPrice} weekday lunch special on Coney Island Avenue, Brooklyn.`,
  path: "/",
});

export default function Home() {
  return (
    <>
      <RestaurantSchema />
      <Hero />
      <LunchSpecial />
      <SignatureDishes />
      <PrivateEventsTeaser />

      <section>
        <Container className="py-16 md:py-20">
          <SectionHeading intro="Open Wednesday through Sunday. Call ahead for larger parties.">
            Visit us
          </SectionHeading>
          <ContactInfo className="mt-10" />
        </Container>
      </section>
    </>
  );
}
