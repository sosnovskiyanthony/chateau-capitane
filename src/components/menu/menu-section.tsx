import { MenuItem } from "@/components/menu/menu-item";
import type { MenuCategory } from "@/lib/data/menu";

export function MenuSection({ category }: { category: MenuCategory }) {
  return (
    <section id={category.id} className="border-t border-stone-300 pt-10">
      <h2 className="font-serif text-2xl text-stone-900 sm:text-3xl">
        {category.name}
      </h2>
      {category.description ? (
        <p className="mt-3 max-w-prose leading-7 text-stone-600">
          {category.description}
        </p>
      ) : null}
      <ul className="mt-6">
        {category.items.map((item) => (
          <MenuItem key={`${category.id}-${item.name}`} item={item} />
        ))}
      </ul>
    </section>
  );
}
