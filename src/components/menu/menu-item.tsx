import type { MenuItem as MenuItemData } from "@/lib/data/menu";

function formatAmount(price: number): string {
  return Number.isInteger(price) ? `$${price}` : `$${price.toFixed(2)}`;
}

export function MenuItem({ item }: { item: MenuItemData }) {
  return (
    <li className="border-t border-stone-200 py-4 first:border-t-0 first:pt-0">
      <div className="flex items-baseline justify-between gap-6">
        <p className="font-serif text-lg leading-snug text-stone-900">
          {item.name}
        </p>
        <p className="shrink-0 tabular-nums text-stone-700">
          {item.price !== undefined ? formatAmount(item.price) : null}
          {item.priceNote ? (
            <span className="ml-1.5 text-sm text-stone-500">
              {item.priceNote}
            </span>
          ) : null}
        </p>
      </div>
      {item.description ? (
        <p className="mt-1 max-w-prose text-sm leading-6 text-stone-600">
          {item.description}
        </p>
      ) : null}
    </li>
  );
}
