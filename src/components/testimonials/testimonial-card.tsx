import type { Testimonial } from "@/lib/data/testimonials";

export function TestimonialCard({
  testimonial,
}: {
  testimonial: Testimonial;
}) {
  return (
    <figure className="border-t border-ivory/15 pt-6">
      <blockquote>
        <p className="leading-7 text-ivory">{testimonial.quote}</p>
      </blockquote>
      <figcaption className="mt-4 text-sm text-ivory-muted">
        <span className="font-semibold text-gold">{testimonial.author}</span>
        {" · "}
        {testimonial.location}
      </figcaption>
    </figure>
  );
}
