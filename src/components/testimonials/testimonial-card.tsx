import type { Testimonial } from "@/lib/data/testimonials";

export function TestimonialCard({
  testimonial,
}: {
  testimonial: Testimonial;
}) {
  return (
    <figure className="border-t border-stone-300 pt-6">
      <blockquote>
        <p className="leading-7 text-stone-700">{testimonial.quote}</p>
      </blockquote>
      <figcaption className="mt-4 text-sm text-stone-500">
        <span className="font-medium text-stone-700">
          {testimonial.author}
        </span>
        {" · "}
        {testimonial.location}
      </figcaption>
    </figure>
  );
}
