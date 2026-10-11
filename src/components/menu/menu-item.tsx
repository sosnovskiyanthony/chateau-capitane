import { Leader } from "@/components/ui/leader";
import type { MenuItem as MenuItemData } from "@/lib/data/menu";
import { translateContent } from "@/lib/i18n/dictionary";
import type { Locale } from "@/lib/i18n/locales";

function formatAmount(price: number): string {
  return Number.isInteger(price) ? `$${price}` : `$${price.toFixed(2)}`;
}

export function MenuItem({ item, locale }: { item: MenuItemData; locale: Locale }) {
  return (
    <li className="break-inside-avoid-column py-3">
      <div className="flex items-end gap-3">
        <p className="font-serif text-lg leading-7 text-ivory">{translateContent(locale, item.name)}</p>
        <Leader />
        <p className="shrink-0 leading-7 tabular-nums text-ivory">
          {item.price !== undefined ? formatAmount(item.price) : null}
          {item.priceNote ? (
            <span className="ml-1.5 text-sm text-ivory-muted">
              {translateContent(locale, item.priceNote)}
            </span>
          ) : null}
        </p>
      </div>
      {item.description ? (
        <p className="mt-1 text-sm leading-6 text-ivory-muted">
          {translateContent(locale, item.description)}
        </p>
      ) : null}
    </li>
  );
}
