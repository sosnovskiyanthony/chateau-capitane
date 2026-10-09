import { Leader } from "@/components/ui/leader";
import type { MenuItem as MenuItemData } from "@/lib/data/menu";

function formatAmount(price: number): string {
  return Number.isInteger(price) ? `$${price}` : `$${price.toFixed(2)}`;
}

export function MenuItem({ item }: { item: MenuItemData }) {
  return (
    <li className="break-inside-avoid-column py-3">
      <div className="flex items-end gap-3">
        <p className="font-serif text-lg leading-7 text-ivory">{item.name}</p>
        <Leader />
        <p className="shrink-0 leading-7 tabular-nums text-ivory">
          {item.price !== undefined ? formatAmount(item.price) : null}
          {item.priceNote ? (
            <span className="ml-1.5 text-sm text-ivory-muted">
              {item.priceNote}
            </span>
          ) : null}
        </p>
      </div>
      {item.description ? (
        <p className="mt-1 text-sm leading-6 text-ivory-muted">
          {item.description}
        </p>
      ) : null}
    </li>
  );
}
