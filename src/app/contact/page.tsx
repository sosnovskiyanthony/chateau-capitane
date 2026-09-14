import type { Metadata } from "next";

import { ContactForm } from "@/components/contact/contact-form";
import { ContactInfo } from "@/components/contact/contact-info";
import { MapEmbed } from "@/components/contact/map-embed";
import { Container } from "@/components/layout/container";
import { site } from "@/lib/data/site";
import { pageMetadata } from "@/lib/metadata";

export const metadata: Metadata = pageMetadata({
  title: "Reservations & Directions, Brooklyn",
  description: `Château Capitaine, ${site.address.full}. Call ${site.phone.display} for reservations and banquet enquiries.`,
  path: "/contact",
});

export default function ContactPage() {
  return (
    <Container className="py-16 md:py-20">
      <header className="max-w-2xl">
        <h1 className="font-serif text-4xl text-stone-900 sm:text-5xl">
          Contact
        </h1>
        <p className="mt-6 text-lg leading-8 text-stone-600">
          Reservations, banquets, and anything else — the phone is quickest,
          especially for a party with a date attached. Otherwise send us a note
          and we&rsquo;ll come back to you.
        </p>
      </header>

      <div className="mt-14 grid gap-12 md:grid-cols-12">
        <div className="md:col-span-7">
          <h2 className="font-serif text-2xl text-stone-900">Send a message</h2>
          <div className="mt-6">
            <ContactForm />
          </div>
        </div>

        <div className="md:col-span-5">
          <h2 className="font-serif text-2xl text-stone-900">Visit or call</h2>
          <ContactInfo columns={1} className="mt-6" />
          <div className="mt-8">
            <MapEmbed />
          </div>
        </div>
      </div>
    </Container>
  );
}
