import type { Metadata } from "next";

import { ContactForm } from "@/components/contact/contact-form";
import { ContactInfo } from "@/components/contact/contact-info";
import { MapEmbed } from "@/components/contact/map-embed";
import { Container } from "@/components/layout/container";
import { PageHeader } from "@/components/ui/page-header";
import { BookCta } from "@/components/ui/book-cta";
import { packageLabel } from "@/lib/data/private-events";
import { site } from "@/lib/data/site";
import { pageMetadata } from "@/lib/metadata";
import { getSiteContent } from "@/lib/server/content/content";

export const metadata: Metadata = pageMetadata({
  title: "Reservations & Directions, Brooklyn",
  description: `Château Capitaine, ${site.address.full}. Book a table on OpenTable or call ${site.phone.display} for banquet enquiries.`,
  path: "/contact",
});

export default async function ContactPage() {
  const { packages } = await getSiteContent();
  return (
    <Container className="pb-20 pt-14 md:pb-28 md:pt-20">
      <PageHeader
        eyebrow="Reservations & directions"
        title="Contact"
        intro={
          <>
            Book your table on OpenTable. For banquets or other enquiries,
            call us or send a note and we&rsquo;ll come back to you.
          </>
        }
      />

      <BookCta className="mt-8" />

      <div className="mt-16 grid gap-16 md:mt-20 md:grid-cols-12 md:gap-12">
        <div className="md:col-span-7">
          <h2 className="font-serif text-2xl tracking-tight text-ivory sm:text-3xl">
            Send a message
          </h2>
          <div className="mt-8">
            <ContactForm
              packages={packages.map((tier) => ({ id: tier.id, label: packageLabel(tier) }))}
            />
          </div>
        </div>

        <div className="bg-ink-800 px-6 py-10 sm:px-8 md:col-span-5 md:self-start">
          <h2 className="font-serif text-2xl tracking-tight text-ivory sm:text-3xl">
            Visit or call
          </h2>
          <ContactInfo columns={1} className="mt-8" />
          <div className="mt-10">
            <MapEmbed />
          </div>
        </div>
      </div>
    </Container>
  );
}
