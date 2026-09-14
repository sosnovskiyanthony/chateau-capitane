import type { MenuCategory } from "@/lib/data/menu";

export function MenuCategoryNav({
  categories,
}: {
  categories: MenuCategory[];
}) {
  return (
    <nav aria-label="Menu sections">
      <ul className="flex flex-wrap gap-x-5 gap-y-2">
        {categories.map((category) => (
          <li key={category.id}>
            <a
              href={`#${category.id}`}
              className="text-sm text-stone-600 underline-offset-4 hover:text-wine-700 hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-wine-700"
            >
              {category.name}
            </a>
          </li>
        ))}
      </ul>
    </nav>
  );
}
