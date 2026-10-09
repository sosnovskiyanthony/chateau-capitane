import type { Metadata } from "next";

import { Container } from "@/components/layout/container";
import { MenuSection } from "@/components/menu/menu-section";
import { CallCta } from "@/components/ui/call-cta";
import { CtaLink } from "@/components/ui/cta-link";
import { Eyebrow } from "@/components/ui/eyebrow";
import { PageHeader } from "@/components/ui/page-header";
import { SectionIndex } from "@/components/ui/section-index";
import {
  getLunchSpecialCourses,
  getMenuCategories,
  menuNotes,
} from "@/lib/data/menu";
import { formatHours, site } from "@/lib/data/site";
import { pageMetadata } from "@/lib/metadata";

export const metadata: Metadata = pageMetadata({
  title: `Seafood & Russian Menu, $${site.lunchSpecialPrice} Lunch`,
  description: `Seafood, salads, soups, dough dishes, kebabs, and entrées, plus the three-course $${site.lunchSpecialPrice} weekday lunch special at Château Capitaine in Brooklyn.`,
  path: "/menu",
});

export default function MenuPage() {
  const categories = getMenuCategories();
  const lunchCourses = getLunchSpecialCourses();

  return (
    <Container className="pb-20 pt-14 md:pb-28 md:pt-20">
      <PageHeader
        eyebrow={formatHours(site.hours.dining)}
        title="Menu"
        intro={
          <>
            Seafood from the raw bar to the grill, the Russian dishes Chef Alik
            passed down, and steaks cut to order. A few prices change with the
            season, and we&rsquo;ll always tell you before you order.
          </>
        }
      />

      <section
        id="lunch-special"
        className="mt-16 bg-ink-800 px-6 py-10 sm:px-10 sm:py-12 md:mt-20"
      >
        <div className="flex flex-wrap items-end justify-between gap-x-8 gap-y-6">
          <div>
            <h2 className="font-serif text-2xl tracking-tight text-ivory sm:text-3xl">
              Lunch special
            </h2>
            <p className="mt-2 leading-7 text-ivory-muted">
              Three courses. Choose one from each. Beverages not included.
            </p>
          </div>
          <div className="sm:text-right">
            <p className="font-serif text-5xl leading-none tabular-nums text-gold">
              ${site.lunchSpecialPrice}
            </p>
            <Eyebrow className="mt-3">
              {formatHours(site.hours.lunchSpecial)}
            </Eyebrow>
          </div>
        </div>

        <div className="mt-10 grid gap-8 sm:grid-cols-3">
          {lunchCourses.map((course) => (
            <div key={course.label}>
              <Eyebrow as="h3">{course.label}</Eyebrow>
              <ul className="mt-4 space-y-2 text-sm leading-6 text-ivory">
                {course.options.map((option) => (
                  <li key={option}>{option}</li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </section>

      <div className="mt-16 md:mt-20 lg:grid lg:grid-cols-12 lg:gap-12">
        <SectionIndex
          label="Menu sections"
          items={categories.map((category) => ({
            id: category.id,
            label: category.name,
          }))}
          className="lg:col-span-3"
        />

        <div className="mt-10 divide-y divide-ivory/10 lg:col-span-9 lg:mt-0">
          {categories.map((category) => (
            <MenuSection key={category.id} category={category} />
          ))}

          <section className="pt-12">
            <h2 className="sr-only">Dining policies</h2>
            <ul className="space-y-2 text-sm leading-6 text-ivory-muted">
              {menuNotes.map((note) => (
                <li key={note}>{note}</li>
              ))}
            </ul>
            <div className="mt-10 flex flex-wrap gap-3">
              <CallCta />
              <CtaLink href="/private-events" variant="secondary">
                See banquet menus
              </CtaLink>
            </div>
          </section>
        </div>
      </div>
    </Container>
  );
}
