import type { Metadata } from "next";

import { Container } from "@/components/layout/container";
import { MenuCategoryNav } from "@/components/menu/menu-category-nav";
import { MenuSection } from "@/components/menu/menu-section";
import { CtaLink } from "@/components/ui/cta-link";
import {
  getLunchSpecialCourses,
  getMenuCategories,
  menuNotes,
} from "@/lib/data/menu";
import { formatHours, site } from "@/lib/data/site";
import { pageMetadata } from "@/lib/metadata";

export const metadata: Metadata = pageMetadata({
  title: `Seafood & Russian Menu, $${site.lunchSpecialPrice} Lunch`,
  description: `Seafood, salads, soups, dough dishes, kebabs, and entrées — plus the four-course $${site.lunchSpecialPrice} weekday lunch special at Château Capitaine in Brooklyn.`,
  path: "/menu",
});

export default function MenuPage() {
  const categories = getMenuCategories();
  const lunchCourses = getLunchSpecialCourses();

  return (
    <Container className="py-16 md:py-20">
      <header className="max-w-2xl">
        <h1 className="font-serif text-4xl text-stone-900 sm:text-5xl">Menu</h1>
        <p className="mt-6 text-lg leading-8 text-stone-600">
          Seafood from the raw bar to the grill, the Russian dishes Chef Alik
          passed down, and steaks cut to order. Prices change with the season on
          a few items — we&rsquo;ll always tell you before you order.
        </p>
      </header>

      <section
        id="lunch-special"
        className="mt-14 border-y border-stone-300 bg-stone-100 px-6 py-10 sm:px-10"
      >
        <div className="flex flex-wrap items-baseline justify-between gap-x-6 gap-y-2">
          <h2 className="font-serif text-2xl text-stone-900 sm:text-3xl">
            Lunch special
          </h2>
          <p className="text-lg text-wine-700">
            ${site.lunchSpecialPrice} · {formatHours(site.hours.lunchSpecial)}
          </p>
        </div>
        <p className="mt-3 max-w-prose leading-7 text-stone-600">
          Four courses. Choose one from each.
        </p>

        <div className="mt-8 grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
          {lunchCourses.map((course) => (
            <div key={course.label}>
              <h3 className="font-serif text-lg text-stone-900">
                {course.label}
              </h3>
              <ul className="mt-3 space-y-1.5 text-sm leading-6 text-stone-600">
                {course.options.map((option) => (
                  <li key={option}>{option}</li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </section>

      <div className="mt-14">
        <MenuCategoryNav categories={categories} />
      </div>

      <div className="mt-12 space-y-14">
        {categories.map((category) => (
          <MenuSection key={category.id} category={category} />
        ))}
      </div>

      <section className="mt-16 border-t border-stone-300 pt-8">
        <h2 className="sr-only">Dining policies</h2>
        <ul className="space-y-2 text-sm leading-6 text-stone-600">
          {menuNotes.map((note) => (
            <li key={note}>{note}</li>
          ))}
        </ul>
      </section>

      <div className="mt-12 flex flex-wrap gap-3">
        <CtaLink href={site.phone.href}>Call {site.phone.display}</CtaLink>
        <CtaLink href="/private-events" variant="secondary">
          Banquet menus
        </CtaLink>
      </div>
    </Container>
  );
}
