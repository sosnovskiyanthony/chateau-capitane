import type { BanquetTier } from "@/lib/data/private-events";

export function TierSection({ tier }: { tier: BanquetTier }) {
  return (
    <section id={tier.id} className="border-t border-stone-300 pt-10">
      <h2 className="font-serif text-2xl text-stone-900 sm:text-3xl">
        {tier.name}{" "}
        <span className="tabular-nums text-wine-700">
          ${tier.pricePerPerson}
        </span>
      </h2>
      <p className="mt-1 text-sm text-stone-500">Per person</p>

      <p className="mt-3 max-w-prose leading-7 text-stone-600">{tier.summary}</p>

      {tier.minGuests ? (
        <p className="mt-2 text-sm text-stone-500">
          Minimum {tier.minGuests} guests.
        </p>
      ) : null}

      <div className="mt-8 grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
        {tier.courses.map((course) => (
          <div key={course.label}>
            <h3 className="font-serif text-lg text-stone-900">
              {course.label}
            </h3>
            <ul className="mt-3 space-y-1.5 text-sm leading-6 text-stone-600">
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
