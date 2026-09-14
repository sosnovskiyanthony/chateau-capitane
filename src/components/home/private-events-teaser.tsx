import { Container } from "@/components/layout/container";
import { CtaLink } from "@/components/ui/cta-link";
import { PlaceholderImage } from "@/components/ui/placeholder-image";
import { getPrivateEventTiers } from "@/lib/data/private-events";

export function PrivateEventsTeaser() {
  const tiers = getPrivateEventTiers();
  const lowest = Math.min(...tiers.map((tier) => tier.pricePerPerson));

  return (
    <section className="border-b border-stone-200">
      <Container className="grid items-center gap-12 py-16 md:grid-cols-12 md:py-20">
        <div className="md:col-span-5">
          <PlaceholderImage
            label="Long table laid for a private party"
            aspect="aspect-3/2"
          />
        </div>

        <div className="md:col-span-6 md:col-start-7">
          <h2 className="font-serif text-3xl leading-tight text-stone-900 sm:text-4xl">
            Your party, our rooms.
          </h2>
          <p className="mt-4 max-w-md text-lg leading-8 text-stone-600">
            All-inclusive banquet menus from ${lowest} a head — the cold table,
            the hot courses, and dessert, all brought out for you.
          </p>
          <CtaLink href="/private-events" variant="secondary" className="mt-6">
            See banquet menus
          </CtaLink>
        </div>
      </Container>
    </section>
  );
}
