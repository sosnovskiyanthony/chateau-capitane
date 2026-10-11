import { Container } from "@/components/layout/container";
import { CtaLink } from "@/components/ui/cta-link";
import { Eyebrow } from "@/components/ui/eyebrow";
import { formatHours } from "@/lib/data/site";
import { getDictionary } from "@/lib/i18n/dictionary";
import { getLocale } from "@/lib/i18n/get-locale";
import { translateContent } from "@/lib/i18n/dictionary";
import { getSiteContent } from "@/lib/server/content/content";

function summarize(options: string[], andMore: (count: number) => string): string {
  const shown = options.slice(0, 3).join(", ");
  const remaining = options.length - 3;
  return remaining > 0 ? `${shown}, ${andMore(remaining)}` : shown;
}

/**
 * Framed like a printed carte: the one place on the site with brass rules, and
 * so the one place course labels stay in gold serif.
 */
export async function LunchSpecial() {
  const locale = await getLocale();
  const t = getDictionary(locale);
  const { hours, lunchCourses: courses, lunchSpecialPrice } = await getSiteContent();

  return (
    <section>
      <Container className="py-16 md:py-20">
        <div className="mx-auto max-w-5xl border border-gold/60 p-1.5">
          <div className="border border-gold/30 px-6 py-14 text-center sm:px-12 sm:py-20">
            <Eyebrow>{t.home.lunch.eyebrow}</Eyebrow>
            <h2 className="mt-5 font-serif text-4xl leading-display tracking-tight text-ivory sm:text-5xl">
              {t.home.lunch.titleBefore}{" "}
              <span className="italic text-gold">
                ${lunchSpecialPrice}
              </span>
            </h2>
            <p className="mt-5 text-ivory-muted">
              {formatHours(hours.lunchSpecial, locale)}. {t.home.lunch.note}
            </p>

            <dl className="mt-14 grid gap-y-10 sm:grid-cols-3 sm:gap-x-8 lg:gap-x-0 lg:divide-x lg:divide-gold/20">
              {courses.map((course) => (
                <div key={course.label} className="lg:px-6">
                  <dt className="font-serif text-xl text-gold">
                    {translateContent(locale, course.label)}
                  </dt>
                  <dd className="mt-3 text-sm leading-6 text-ivory-muted">
                    {summarize(
                      course.options.map((option) => translateContent(locale, option)),
                      t.home.lunch.andMore,
                    )}
                  </dd>
                </div>
              ))}
            </dl>

            <CtaLink
              href="/menu#lunch-special"
              variant="secondary"
              className="mt-14"
            >
              {t.home.lunch.fullMenu}
            </CtaLink>
          </div>
        </div>
      </Container>
    </section>
  );
}
