import type { Metadata } from "next";

import { Container } from "@/components/layout/container";
import { TestimonialCard } from "@/components/testimonials/testimonial-card";
import { CtaLink } from "@/components/ui/cta-link";
import { PageHeader } from "@/components/ui/page-header";
import { getTestimonials, type Testimonial } from "@/lib/data/testimonials";
import { site } from "@/lib/data/site";
import { getDictionary } from "@/lib/i18n/dictionary";
import { getLocale } from "@/lib/i18n/get-locale";
import { pageMetadata } from "@/lib/metadata";

export async function generateMetadata(): Promise<Metadata> {
  const locale = await getLocale();
  const t = getDictionary(locale).meta;
  return pageMetadata({
    locale,
    title: t.testimonialsTitle,
    description: t.testimonialsDescription,
    path: "/testimonials",
  });
}

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

export default async function TestimonialsPage() {
  const t = getDictionary(await getLocale()).testimonials;
  const columns = splitIntoColumns(getTestimonials());

  return (
    <Container className="pb-20 pt-14 md:pb-28 md:pt-20">
      <PageHeader
        eyebrow={t.eyebrow}
        title={t.title}
        intro={t.intro}
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
          {t.recentTitle}
        </h2>
        <p className="mt-4 max-w-prose leading-7 text-ivory-muted">
          {t.recent}
        </p>
        <div className="mt-8 flex flex-wrap gap-3">
          <CtaLink href={site.social.yelp}>{t.writeReview}</CtaLink>
          <CtaLink href="/contact" variant="secondary">
            {t.tellUs}
          </CtaLink>
        </div>
      </section>
    </Container>
  );
}
