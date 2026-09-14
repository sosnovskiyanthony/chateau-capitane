import { Container } from "@/components/layout/container";
import { CtaLink } from "@/components/ui/cta-link";
import { getLunchSpecialCourses } from "@/lib/data/menu";
import { formatHours, site } from "@/lib/data/site";

function summarize(options: string[]): string {
  const shown = options.slice(0, 3).join(", ");
  const remaining = options.length - 3;
  return remaining > 0 ? `${shown}, and ${remaining} more` : shown;
}

export function LunchSpecial() {
  const courses = getLunchSpecialCourses();

  return (
    <section className="border-b border-stone-200 bg-stone-100">
      <Container className="py-16 md:py-20">
        <div className="grid gap-10 md:grid-cols-12">
          <div className="md:col-span-5">
            <h2 className="font-serif text-3xl leading-tight text-stone-900 sm:text-4xl">
              Four courses, ${site.lunchSpecialPrice}, midday.
            </h2>
            <p className="mt-4 text-lg leading-8 text-stone-600">
              {formatHours(site.hours.lunchSpecial)}. Choose one from each
              course.
            </p>
            <CtaLink
              href="/menu#lunch-special"
              variant="secondary"
              className="mt-6"
            >
              Full lunch menu
            </CtaLink>
          </div>

          <dl className="md:col-span-6 md:col-start-7">
            {courses.map((course) => (
              <div
                key={course.label}
                className="grid grid-cols-3 gap-4 border-t border-stone-300 py-4 first:border-t-0 first:pt-0"
              >
                <dt className="font-serif text-lg text-stone-900">
                  {course.label}
                </dt>
                <dd className="col-span-2 text-stone-600">
                  {summarize(course.options)}
                </dd>
              </div>
            ))}
          </dl>
        </div>
      </Container>
    </section>
  );
}
