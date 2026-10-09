import { Eyebrow } from "@/components/ui/eyebrow";
import type { BanquetTier } from "@/lib/data/private-events";

/** Sits in a `divide-y` list, so its padding sets the space either side of each rule. */
export function TierSection({ tier }: { tier: BanquetTier }) {
  return (
    <section
      id={tier.id}
      className="scroll-mt-16 py-12 first:pt-0 lg:scroll-mt-4"
    >
      <h2 className="flex flex-wrap items-baseline justify-between gap-x-6 gap-y-1 font-serif text-3xl leading-tight tracking-tight text-ivory sm:text-4xl">
        <span>{tier.name}</span>{" "}
        <span className="tabular-nums text-gold">${tier.pricePerPerson}</span>
      </h2>
      <Eyebrow className="mt-3">Per person, all-inclusive</Eyebrow>

      <p className="mt-5 max-w-prose leading-7 text-ivory-muted">
        {tier.summary}
      </p>

      {tier.minGuests ? (
        <p className="mt-2 text-sm text-ivory-muted">
          Minimum {tier.minGuests} guests.
        </p>
      ) : null}

      <div className="mt-10 grid gap-x-8 gap-y-10 sm:grid-cols-2 xl:grid-cols-4">
        {tier.courses.map((course) => (
          <div key={course.label}>
            <Eyebrow as="h3">{course.label}</Eyebrow>
            <ul className="mt-4 space-y-2 text-sm leading-6 text-ivory">
              {course.items.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </div>
        ))}
      </div>
    </section>
  );
}
