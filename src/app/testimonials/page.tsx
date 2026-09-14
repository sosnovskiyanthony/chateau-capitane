import type { Metadata } from "next";

import { Container } from "@/components/layout/container";
import { TestimonialCard } from "@/components/testimonials/testimonial-card";
import { CtaLink } from "@/components/ui/cta-link";
import { getTestimonials, type Testimonial } from "@/lib/data/testimonials";
import { site } from "@/lib/data/site";
import { pageMetadata } from "@/lib/metadata";

export const metadata: Metadata = pageMetadata({
  title: "Guest Reviews of Dinners & Banquets",
  description:
    "Guest reviews of dinners, birthdays, anniversaries, and banquets at Château Capitaine in Brooklyn, plus where to read our latest reviews on Yelp.",
  path: "/testimonials",
});

/** Author line and spacing, measured in quote characters. */
const CAPTION_WEIGHT = 150;

// CSS columns balance badly around long quotes, so place each in the shorter column.
function splitIntoColumns(
  testimonials: Testimonial[],
): [Testimonial[], Testimonial[]] {
  const columns: [Testimonial[], Testimonial[]] = [[], []];
  const heights = [0, 0];

  for (const testimonial of testimonials) {
    const target = heights[0] <= heights[1] ? 0 : 1;
    columns[target].push(testimonial);
    heights[target] += testimonial.quote.length + CAPTION_WEIGHT;
  }

  return columns;
}

export default function TestimonialsPage() {
  const columns = splitIntoColumns(getTestimonials());

  return (
    <Container className="py-16 md:py-20">
      <header className="max-w-2xl">
        <h1 className="font-serif text-4xl text-stone-900 sm:text-5xl">
          What guests say
        </h1>
        <p className="mt-6 text-lg leading-8 text-stone-600">
          Collected from guests who have eaten here and celebrated here. The
          most recent reviews live on Yelp.
        </p>
      </header>

      <div className="mt-14 grid gap-x-10 gap-y-8 md:grid-cols-2">
        {columns.map((column, index) => (
          <div key={index} className="space-y-8">
            {column.map((testimonial) => (
              <TestimonialCard key={testimonial.id} testimonial={testimonial} />
            ))}
          </div>
        ))}
      </div>

      <section className="mt-14 border-t border-stone-300 pt-10">
        <h2 className="font-serif text-2xl text-stone-900">
          Eaten with us recently?
        </h2>
        <p className="mt-3 max-w-prose leading-7 text-stone-600">
          We read everything. Leaving a review on Yelp is the quickest way to
          reach us and anyone deciding where to eat tonight.
        </p>
        <div className="mt-6 flex flex-wrap gap-3">
          <CtaLink href={site.social.yelp} variant="secondary">
            Write a review on Yelp
          </CtaLink>
          <CtaLink href="/contact" variant="secondary">
            Tell us directly
          </CtaLink>
        </div>
      </section>
    </Container>
  );
}
