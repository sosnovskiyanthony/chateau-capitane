import { Container } from "@/components/layout/container";
import { CtaLink } from "@/components/ui/cta-link";
import { Eyebrow } from "@/components/ui/eyebrow";
import { getLunchSpecialCourses } from "@/lib/data/menu";
import { formatHours, site } from "@/lib/data/site";

function summarize(options: string[]): string {
  const shown = options.slice(0, 3).join(", ");
  const remaining = options.length - 3;
  return remaining > 0 ? `${shown}, and ${remaining} more` : shown;
}

/**
 * Framed like a printed carte: the one place on the site with brass rules, and
 * so the one place course labels stay in gold serif.
 */
export function LunchSpecial() {
  const courses = getLunchSpecialCourses();

  return (
    <section>
      <Container className="py-16 md:py-20">
        <div className="mx-auto max-w-5xl border border-gold/60 p-1.5">
          <div className="border border-gold/30 px-6 py-14 text-center sm:px-12 sm:py-20">
            <Eyebrow>Lunch special</Eyebrow>
            <h2 className="mt-5 font-serif text-4xl leading-display tracking-tight text-ivory sm:text-5xl">
              Three courses for{" "}
              <span className="italic text-gold">
                ${site.lunchSpecialPrice}
              </span>
            </h2>
            <p className="mt-5 text-ivory-muted">
              {formatHours(site.hours.lunchSpecial)}. One from each course.
              {" "}Beverages not included.
            </p>

            <dl className="mt-14 grid gap-y-10 sm:grid-cols-3 sm:gap-x-8 lg:gap-x-0 lg:divide-x lg:divide-gold/20">
              {courses.map((course) => (
                <div key={course.label} className="lg:px-6">
                  <dt className="font-serif text-xl text-gold">
                    {course.label}
                  </dt>
                  <dd className="mt-3 text-sm leading-6 text-ivory-muted">
                    {summarize(course.options)}
                  </dd>
                </div>
              ))}
            </dl>

            <CtaLink
              href="/menu#lunch-special"
              variant="secondary"
              className="mt-14"
            >
              Full lunch menu
            </CtaLink>
          </div>
        </div>
      </Container>
    </section>
  );
}
