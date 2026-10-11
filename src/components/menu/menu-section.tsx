import { MenuItem } from "@/components/menu/menu-item";
import type { MenuCategory } from "@/lib/data/menu";
import { translateContent } from "@/lib/i18n/dictionary";
import type { Locale } from "@/lib/i18n/locales";

/** Sits in a `divide-y` list, so its padding sets the space either side of each rule. */
export function MenuSection({ category, locale }: { category: MenuCategory; locale: Locale }) {
  return (
    <section
      id={category.id}
      className="scroll-mt-16 py-12 first:pt-0 lg:scroll-mt-4"
    >
      <h2 className="font-serif text-3xl leading-tight tracking-tight text-ivory sm:text-4xl">
        {translateContent(locale, category.name)}
      </h2>
      {category.description ? (
        <p className="mt-3 max-w-prose leading-7 text-ivory-muted">
          {translateContent(locale, category.description)}
        </p>
      ) : null}
      <ul className="mt-8 gap-x-12 md:columns-2">
        {category.items.map((item) => (
          <MenuItem key={`${category.id}-${item.name}`} item={item} locale={locale} />
        ))}
      </ul>
    </section>
  );
}
