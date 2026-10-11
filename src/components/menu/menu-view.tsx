import { Container } from "@/components/layout/container";
import { MenuSection } from "@/components/menu/menu-section";
import { CallCta } from "@/components/ui/call-cta";
import { CtaLink } from "@/components/ui/cta-link";
import { Eyebrow } from "@/components/ui/eyebrow";
import { PageHeader } from "@/components/ui/page-header";
import { SectionIndex } from "@/components/ui/section-index";
import { formatHours } from "@/lib/data/site";
import { getDictionary } from "@/lib/i18n/dictionary";
import { getLocale } from "@/lib/i18n/get-locale";
import { translateContent } from "@/lib/i18n/dictionary";
import type { SiteContent } from "@/lib/server/content/document";

/** The menu page body; also rendered by the staff preview with draft content. */
export async function MenuView({ content }: { content: SiteContent }) {
  const locale = await getLocale();
  const t = getDictionary(locale);
  const categories = content.menuCategories;
  const lunchCourses = content.lunchCourses;

  return (
    <Container className="pb-20 pt-14 md:pb-28 md:pt-20">
      <PageHeader
        eyebrow={formatHours(content.hours.dining, locale)}
        title={t.menu.title}
        intro={t.menu.intro}
      />

      <section
        id="lunch-special"
        className="mt-16 bg-ink-800 px-6 py-10 sm:px-10 sm:py-12 md:mt-20"
      >
        <div className="flex flex-wrap items-end justify-between gap-x-8 gap-y-6">
          <div>
            <h2 className="font-serif text-2xl tracking-tight text-ivory sm:text-3xl">
              {t.menu.lunchTitle}
            </h2>
            <p className="mt-2 leading-7 text-ivory-muted">
              {t.menu.lunchNote}
            </p>
          </div>
          <div className="sm:text-right">
            <p className="font-serif text-5xl leading-none tabular-nums text-gold">
              ${content.lunchSpecialPrice}
            </p>
            <Eyebrow className="mt-3">
              {formatHours(content.hours.lunchSpecial, locale)}
            </Eyebrow>
          </div>
        </div>

        <div className="mt-10 grid gap-8 sm:grid-cols-3">
          {lunchCourses.map((course) => (
            <div key={course.label}>
              <Eyebrow as="h3">{translateContent(locale, course.label)}</Eyebrow>
              <ul className="mt-4 space-y-2 text-sm leading-6 text-ivory">
                {course.options.map((option) => (
                  <li key={option}>{translateContent(locale, option)}</li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </section>

      <div className="mt-16 md:mt-20 lg:grid lg:grid-cols-12 lg:gap-12">
        <SectionIndex
          label={t.menu.sections}
          items={categories.map((category) => ({
            id: category.id,
            label: translateContent(locale, category.name),
          }))}
          className="lg:col-span-3"
        />

        <div className="mt-10 divide-y divide-ivory/10 lg:col-span-9 lg:mt-0">
          {categories.map((category) => (
            <MenuSection key={category.id} category={category} locale={locale} />
          ))}

          <section className="pt-12">
            <h2 className="sr-only">{t.menu.policies}</h2>
            <ul className="space-y-2 text-sm leading-6 text-ivory-muted">
              {content.menuNotes.map((note) => (
                <li key={note}>{translateContent(locale, note)}</li>
              ))}
            </ul>
            <div className="mt-10 flex flex-wrap gap-3">
              <CallCta />
              <CtaLink href="/private-events" variant="secondary">
                {t.cta.seeBanquets}
              </CtaLink>
            </div>
          </section>
        </div>
      </div>
    </Container>
  );
}
