import { MenuItem } from "@/components/menu/menu-item";
import type { MenuCategory } from "@/lib/data/menu";

/** Sits in a `divide-y` list, so its padding sets the space either side of each rule. */
export function MenuSection({ category }: { category: MenuCategory }) {
  return (
    <section
      id={category.id}
      className="scroll-mt-16 py-12 first:pt-0 lg:scroll-mt-4"
    >
      <h2 className="font-serif text-3xl leading-tight tracking-tight text-ivory sm:text-4xl">
        {category.name}
      </h2>
      {category.description ? (
        <p className="mt-3 max-w-prose leading-7 text-ivory-muted">
          {category.description}
        </p>
      ) : null}
      <ul className="mt-8 gap-x-12 md:columns-2">
        {category.items.map((item) => (
          <MenuItem key={`${category.id}-${item.name}`} item={item} />
        ))}
      </ul>
    </section>
  );
}
