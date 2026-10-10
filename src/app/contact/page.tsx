import type { Metadata } from "next";
import Link from "next/link";

import { ContactForm } from "@/components/contact/contact-form";
import { ContactInfo } from "@/components/contact/contact-info";
import { MapEmbed } from "@/components/contact/map-embed";
import { Container } from "@/components/layout/container";
import { linkClasses } from "@/components/ui/styles";
import { PageHeader } from "@/components/ui/page-header";
import { BookCta } from "@/components/ui/book-cta";
import { packageLabel } from "@/lib/data/private-events";
import { formatHours, site } from "@/lib/data/site";
import { pageMetadata } from "@/lib/metadata";
import { getSiteContent } from "@/lib/server/content/content";

export async function generateMetadata(): Promise<Metadata> {
  const { hours } = await getSiteContent();
  return pageMetadata({
    title: "Reservations, Hours & Directions",
    description: `${site.address.full}. Open ${formatHours(hours.dining)}. Reserve on OpenTable or call ${site.phone.display} for banquets and large parties.`,
    path: "/contact",
  });
}

export default async function ContactPage() {
  const { packages, hours, lunchSpecialPrice, menuNotes } = await getSiteContent();
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

      <section className="mt-16 max-w-3xl md:mt-20">
        <h2 className="font-serif text-2xl tracking-tight text-ivory sm:text-3xl">
          Good to know before you come
        </h2>
        <div className="mt-8 space-y-6 leading-7 text-ivory-muted">
          <div>
            <h3 className="text-lg text-ivory">Is there a weekday lunch special?</h3>
            <p>
              Yes: three courses for ${lunchSpecialPrice},{" "}
              {formatHours(hours.lunchSpecial)}. Beverages are not included.
            </p>
          </div>
          <div>
            <h3 className="text-lg text-ivory">Do you host private parties?</h3>
            <p>
              Yes, in private rooms with all-inclusive Russian-style banquet
              packages. See <Link href="/private-events" className={linkClasses}>banquets</Link>,
              or call {site.phone.display}.
            </p>
          </div>
          <div>
            <h3 className="text-lg text-ivory">Minimums and corkage</h3>
            <ul className="list-inside list-disc">
              {menuNotes.map((note) => (
                <li key={note}>{note}</li>
              ))}
            </ul>
          </div>
        </div>
      </section>
    </Container>
  );
}
