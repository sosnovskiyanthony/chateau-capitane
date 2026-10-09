import Link from "next/link";

import { Container } from "@/components/layout/container";
import { CtaLink } from "@/components/ui/cta-link";
import { Leader } from "@/components/ui/leader";
import { SectionHeading } from "@/components/ui/section-heading";
import { getPrivateEventTiers } from "@/lib/data/private-events";

export function PrivateEventsTeaser() {
  const tiers = getPrivateEventTiers();
  const lowest = Math.min(...tiers.map((tier) => tier.pricePerPerson));
  const highest = Math.max(...tiers.map((tier) => tier.pricePerPerson));

  return (
    <section className="bg-ink-800">
      <Container className="grid gap-14 py-20 md:grid-cols-12 md:items-center md:py-28">
        <div className="md:col-span-5">
          <SectionHeading
            eyebrow="Private events"
            intro={
              <>
                All-inclusive set menus from ${lowest} to ${highest} a head,
                brought out course by course in our private rooms.
              </>
            }
          >
            Your party, our rooms.
          </SectionHeading>
          <CtaLink href="/private-events" variant="secondary" className="mt-10">
            See banquet menus
          </CtaLink>
        </div>

        <ul className="md:col-span-6 md:col-start-7">
          {tiers.map((tier) => (
            <li key={tier.id}>
              <Link
                href={`/private-events#${tier.id}`}
                className="flex min-h-12 items-end gap-4 py-2.5 font-serif text-xl text-ivory transition-colors hover:text-gold focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gold"
              >
                <span>{tier.name}</span>
                <Leader />
                <span className="font-sans text-base tabular-nums">
                  ${tier.pricePerPerson}
                </span>
              </Link>
            </li>
          ))}
        </ul>
      </Container>
    </section>
  );
}
