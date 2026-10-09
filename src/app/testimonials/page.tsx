import type { Metadata } from "next";

import { Container } from "@/components/layout/container";
import { TestimonialCard } from "@/components/testimonials/testimonial-card";
import { CtaLink } from "@/components/ui/cta-link";
import { PageHeader } from "@/components/ui/page-header";
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
    <Container className="pb-20 pt-14 md:pb-28 md:pt-20">
      <PageHeader
        eyebrow="Testimonials"
        title="What guests say"
        intro="Collected from guests who have eaten here and celebrated here. The most recent reviews live on Yelp."
      />

      <div className="mt-16 grid gap-x-12 gap-y-10 md:mt-20 md:grid-cols-2">
        {columns.map((column, index) => (
          <div key={index} className="space-y-10">
            {column.map((testimonial) => (
              <TestimonialCard key={testimonial.id} testimonial={testimonial} />
            ))}
          </div>
        ))}
      </div>

      <section className="mt-20 bg-ink-800 px-6 py-10 sm:px-10 sm:py-12 md:mt-24">
        <h2 className="font-serif text-2xl tracking-tight text-ivory sm:text-3xl">
          Eaten with us recently?
        </h2>
        <p className="mt-4 max-w-prose leading-7 text-ivory-muted">
          We read everything. Leaving a review on Yelp is the quickest way to
          reach us and anyone deciding where to eat tonight.
        </p>
        <div className="mt-8 flex flex-wrap gap-3">
          <CtaLink href={site.social.yelp}>Write a review on Yelp</CtaLink>
          <CtaLink href="/contact" variant="secondary">
            Tell us directly
          </CtaLink>
        </div>
      </section>
    </Container>
  );
}
