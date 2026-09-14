import { Container } from "@/components/layout/container";
import { CtaLink } from "@/components/ui/cta-link";
import { PlaceholderImage } from "@/components/ui/placeholder-image";
import { site } from "@/lib/data/site";

export function Hero() {
  return (
    <section className="border-b border-stone-200">
      <Container className="grid items-center gap-12 py-16 md:grid-cols-12 md:py-24">
        <div className="md:col-span-6 lg:col-span-5">
          <h1 className="font-serif text-4xl leading-[1.1] text-stone-900 sm:text-5xl lg:text-6xl">
            A father&rsquo;s recipes, a son&rsquo;s kitchen.
          </h1>
          <p className="mt-6 max-w-md text-lg leading-8 text-stone-600">
            Chef Stanley learned to cook in his father Alik&rsquo;s kitchen.
            Seafood, Russian banquets, and weekday lunch on Coney Island Avenue.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <CtaLink href="/menu">See the menu</CtaLink>
            <CtaLink href={site.phone.href} variant="secondary">
              Call {site.phone.display}
            </CtaLink>
          </div>
        </div>

        <div className="md:col-span-6 md:col-start-7">
          <PlaceholderImage
            label="Dining room set for a banquet"
            aspect="aspect-4/5"
          />
        </div>
      </Container>
    </section>
  );
}
