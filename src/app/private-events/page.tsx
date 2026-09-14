import type { Metadata } from "next";

import { Container } from "@/components/layout/container";
import { TierNav } from "@/components/private-events/tier-nav";
import { TierSection } from "@/components/private-events/tier-section";
import { CtaLink } from "@/components/ui/cta-link";
import { PlaceholderImage } from "@/components/ui/placeholder-image";
import { getPrivateEventTiers } from "@/lib/data/private-events";
import { site } from "@/lib/data/site";
import { pageMetadata } from "@/lib/metadata";

const tiers = getPrivateEventTiers();
const lowest = Math.min(...tiers.map((tier) => tier.pricePerPerson));
const highest = Math.max(...tiers.map((tier) => tier.pricePerPerson));

export const metadata: Metadata = pageMetadata({
  title: `Private Banquets in Brooklyn, $${lowest}–$${highest}`,
  description: `All-inclusive Russian-style banquet packages from $${lowest} to $${highest} per person, in private rooms at Château Capitaine in Brooklyn.`,
  path: "/private-events",
});

export default function PrivateEventsPage() {

  return (
    <Container className="py-16 md:py-20">
      <div className="grid gap-12 md:grid-cols-12">
        <header className="md:col-span-6">
          <h1 className="font-serif text-4xl leading-tight text-stone-900 sm:text-5xl">
            Banquets in our own rooms
          </h1>
          <p className="mt-6 text-lg leading-8 text-stone-600">
            Birthdays, anniversaries, memorials, christenings. Every package is
            all-inclusive and priced per person, from ${lowest} to ${highest} —
            cold table, hot appetizers, entrées, and dessert, brought out
            course by course.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <CtaLink href={site.phone.href}>Call {site.phone.display}</CtaLink>
            <CtaLink href="/contact" variant="secondary">
              Send us the details
            </CtaLink>
          </div>
        </header>

        <div className="md:col-span-5 md:col-start-8">
          <PlaceholderImage
            label="Private dining room set for a banquet"
            aspect="aspect-4/3"
          />
        </div>
      </div>

      <section className="mt-16 border-y border-stone-300 bg-stone-100 px-6 py-10 sm:px-10">
        <h2 className="font-serif text-2xl text-stone-900">
          Booking your date
        </h2>
        <p className="mt-3 max-w-prose leading-7 text-stone-600">
          Room capacity, minimum guest counts, and the deposit depend on the
          date and the room, so we handle those on the phone rather than
          publishing one number that won&rsquo;t fit your party. Call us with
          your date and headcount and we&rsquo;ll tell you what fits. Banquets
          are exempt from the corkage fee.
        </p>
      </section>

      <div className="mt-14">
        <TierNav tiers={tiers} />
      </div>

      <div className="mt-12 space-y-14">
        {tiers.map((tier) => (
          <TierSection key={tier.id} tier={tier} />
        ))}
      </div>

      <section className="mt-16 border-t border-stone-300 pt-10">
        <h2 className="font-serif text-2xl text-stone-900">
          Something else in mind?
        </h2>
        <p className="mt-3 max-w-prose leading-7 text-stone-600">
          These are the packages we run most often, not a closed list. If your
          party needs something different — dietary restrictions, a smaller
          group, a menu built around one dish — tell us and we&rsquo;ll put it
          together.
        </p>
        <CtaLink href={site.phone.href} className="mt-6">
          Call {site.phone.display}
        </CtaLink>
      </section>
    </Container>
  );
}
