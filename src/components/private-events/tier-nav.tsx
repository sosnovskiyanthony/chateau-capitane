import type { BanquetTier } from "@/lib/data/private-events";

export function TierNav({ tiers }: { tiers: BanquetTier[] }) {
  return (
    <nav aria-label="Banquet packages">
      <ul className="flex flex-wrap gap-x-5 gap-y-2">
        {tiers.map((tier) => (
          <li key={tier.id}>
            <a
              href={`#${tier.id}`}
              className="text-sm text-stone-600 underline-offset-4 hover:text-wine-700 hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-wine-700"
            >
              {tier.name}{" "}
              <span className="tabular-nums">${tier.pricePerPerson}</span>
            </a>
          </li>
        ))}
      </ul>
    </nav>
  );
}
