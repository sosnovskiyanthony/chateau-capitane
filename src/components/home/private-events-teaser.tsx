import Link from "next/link";

import { Container } from "@/components/layout/container";
import { CtaLink } from "@/components/ui/cta-link";
import { Leader } from "@/components/ui/leader";
import { SectionHeading } from "@/components/ui/section-heading";
import { priceRange } from "@/components/private-events/private-events-view";
import { getDictionary } from "@/lib/i18n/dictionary";
import { getLocale } from "@/lib/i18n/get-locale";
import { translateContent } from "@/lib/i18n/dictionary";
import { localePath } from "@/lib/i18n/locales";
import { getSiteContent } from "@/lib/server/content/content";

export async function PrivateEventsTeaser() {
  const locale = await getLocale();
  const t = getDictionary(locale);
  const tiers = (await getSiteContent()).packages;
  const { lowest, highest } = priceRange(tiers);

  return (
    <section className="bg-ink-800">
      <Container className="grid gap-14 py-20 md:grid-cols-12 md:items-center md:py-28">
        <div className="md:col-span-5">
          <SectionHeading
            eyebrow={t.home.teaser.eyebrow}
            intro={t.home.teaser.intro(lowest, highest)}
          >
            {t.home.teaser.title}
          </SectionHeading>
          <CtaLink href="/private-events" variant="secondary" className="mt-10">
            {t.cta.seeBanquets}
          </CtaLink>
        </div>

        <ul className="md:col-span-6 md:col-start-7">
          {tiers.map((tier) => (
            <li key={tier.id}>
              <Link
                href={localePath(locale, `/private-events#${tier.id}`)}
                className="flex min-h-12 items-end gap-4 py-2.5 font-serif text-xl text-ivory transition-colors hover:text-gold focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gold"
              >
                <span>{translateContent(locale, tier.name)}</span>
                <Leader />
                <span className="font-sans text-base tabular-nums">
                  ${tier.pricePerPerson}
                </span>
              </Link>
            </li>
          ))}
        </ul>
      </Container>
    </section>
  );
}
