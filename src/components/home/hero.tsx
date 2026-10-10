import { Container } from "@/components/layout/container";
import { BookCta } from "@/components/ui/book-cta";
import { CallCta } from "@/components/ui/call-cta";
import { ChartRose } from "@/components/ui/chart-rose";
import { CtaLink } from "@/components/ui/cta-link";

export function Hero() {
  return (
    <section className="relative isolate overflow-hidden">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -right-56 -top-40 -z-10 size-160 text-gold opacity-40 md:-right-40 md:top-1/2 md:size-176 md:-translate-y-1/2 md:opacity-75"
      >
        <ChartRose className="size-full motion-safe:animate-chart" />
      </div>

      <Container className="pb-16 pt-20 md:pb-20 md:pt-28 lg:pt-32">
        <div className="max-w-3xl">
          <h1 className="font-serif text-5xl leading-display tracking-tight text-ivory sm:text-6xl lg:text-7xl">
            <span className="mb-8 block font-sans text-xs font-semibold uppercase tracking-caps text-gold motion-safe:animate-rise">
              Russian &amp; seafood restaurant, Coney Island Avenue, Brooklyn
            </span>
            A father&rsquo;s recipes,{" "}
            <span className="block italic text-gold">
              a son&rsquo;s kitchen.
            </span>
          </h1>
          <p className="mt-8 max-w-xl text-lg leading-8 text-ivory-muted">
            Chef Stanley learned to cook in his father Alik&rsquo;s kitchen.
            Oysters and caviar, grilled fish, pelmeni and borscht, Russian
            banquets, and a weekday lunch special.
          </p>
          <div className="mt-12 flex flex-wrap gap-3">
            <BookCta />
            <CallCta variant="secondary" />
            <CtaLink href="/menu" variant="secondary">See the menu</CtaLink>
          </div>
        </div>
      </Container>
    </section>
  );
}
