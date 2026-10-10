import type { Metadata } from "next";

import { Container } from "@/components/layout/container";
import { TierSection } from "@/components/private-events/tier-section";
import { CallCta } from "@/components/ui/call-cta";
import { CtaLink } from "@/components/ui/cta-link";
import { PageHeader } from "@/components/ui/page-header";
import { PlaceholderImage } from "@/components/ui/placeholder-image";
import { SectionIndex } from "@/components/ui/section-index";
import { getPrivateEventTiers } from "@/lib/data/private-events";
import { pageMetadata } from "@/lib/metadata";

const tiers = getPrivateEventTiers();
const lowest = Math.min(...tiers.map((tier) => tier.pricePerPerson));
const highest = Math.max(...tiers.map((tier) => tier.pricePerPerson));

export const metadata: Metadata = pageMetadata({
  title: `Private Banquets in Brooklyn, $${lowest} to $${highest}`,
  description: `All-inclusive Russian-style banquet packages from $${lowest} to $${highest} per person, in private rooms at Château Capitaine in Brooklyn.`,
  path: "/private-events",
});

export default function PrivateEventsPage() {
  return (
    <Container className="pb-20 pt-14 md:pb-28 md:pt-20">
      <div className="grid gap-12 md:grid-cols-12 md:items-end">
        <PageHeader
          eyebrow="Private events"
          title="Banquets in our own rooms"
          intro={
            <>
              Birthdays, anniversaries, memorials, christenings. Every package
              is all-inclusive and priced per person, from ${lowest} to $
              {highest}, with the cold table, hot appetizers, entrées, and
              dessert brought out course by course.
            </>
          }
          className="md:col-span-6"
        >
          <CallCta />
          <CtaLink href="/contact?event=undecided" variant="secondary">
            Send us the details
          </CtaLink>
        </PageHeader>

        <div className="md:col-span-5 md:col-start-8">
          <PlaceholderImage
            label="Private dining room set for a banquet"
            aspect="aspect-4/3"
          />
        </div>
      </div>

      <section className="mt-16 grid gap-4 bg-ink-800 px-6 py-10 sm:px-10 sm:py-12 md:mt-20 md:grid-cols-12 md:gap-10">
        <h2 className="font-serif text-2xl tracking-tight text-ivory sm:text-3xl md:col-span-4">
          Booking your date
        </h2>
        <p className="leading-7 text-ivory-muted md:col-span-8">
          Room capacity, minimum guest counts, and the deposit depend on the
          date and the room, so we handle those on the phone rather than
          publishing one number that won&rsquo;t fit your party. Call us with
          your date and headcount and we&rsquo;ll tell you what fits. Banquets
          are exempt from the corkage fee.
        </p>
      </section>

      <div className="mt-16 md:mt-20 lg:grid lg:grid-cols-12 lg:gap-12">
        <SectionIndex
          label="Banquet packages"
          items={tiers.map((tier) => ({
            id: tier.id,
            label: `${tier.name} $${tier.pricePerPerson}`,
          }))}
          className="lg:col-span-3"
        />

        <div className="mt-10 divide-y divide-ivory/10 lg:col-span-9 lg:mt-0">
          {tiers.map((tier) => (
            <TierSection key={tier.id} tier={tier} />
          ))}

          <section className="pt-12">
            <h2 className="font-serif text-2xl tracking-tight text-ivory sm:text-3xl">
              Something else in mind?
            </h2>
            <p className="mt-4 max-w-prose leading-7 text-ivory-muted">
              These are the packages we run most often, not a closed list. If
              your party needs something different, such as dietary
              restrictions, a smaller group, or a menu built around one dish,
              tell us and we&rsquo;ll put it together.
            </p>
            <CallCta className="mt-8" />
          </section>
        </div>
      </div>
    </Container>
  );
}
