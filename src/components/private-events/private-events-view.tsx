import { Container } from "@/components/layout/container";
import { TierSection } from "@/components/private-events/tier-section";
import { CallCta } from "@/components/ui/call-cta";
import { CtaLink } from "@/components/ui/cta-link";
import { PageHeader } from "@/components/ui/page-header";
import { PlaceholderImage } from "@/components/ui/placeholder-image";
import { SectionIndex } from "@/components/ui/section-index";
import type { BanquetTier } from "@/lib/data/private-events";
import { getDictionary, translateContent } from "@/lib/i18n/dictionary";
import { getLocale } from "@/lib/i18n/get-locale";

export function priceRange(tiers: BanquetTier[]) {
  const prices = tiers.map((tier) => tier.pricePerPerson);
  return { lowest: Math.min(...prices), highest: Math.max(...prices) };
}

/** The private events page body; also rendered by the staff preview with draft content. */
export async function PrivateEventsView({ tiers }: { tiers: BanquetTier[] }) {
  const locale = await getLocale();
  const t = getDictionary(locale).events;
  const { lowest, highest } = priceRange(tiers);
  return (
    <Container className="pb-20 pt-14 md:pb-28 md:pt-20">
      <div className="grid gap-12 md:grid-cols-12 md:items-end">
        <PageHeader
          eyebrow={t.eyebrow}
          title={t.title}
          intro={t.intro(lowest, highest)}
          className="md:col-span-6"
        >
          <CallCta />
          <CtaLink href="/contact?event=undecided" variant="secondary">
            {t.sendDetails}
          </CtaLink>
        </PageHeader>

        <div className="md:col-span-5 md:col-start-8">
          <PlaceholderImage
            label={t.roomPhoto}
            aspect="aspect-4/3"
          />
        </div>
      </div>

      <section className="mt-16 grid gap-4 bg-ink-800 px-6 py-10 sm:px-10 sm:py-12 md:mt-20 md:grid-cols-12 md:gap-10">
        <h2 className="font-serif text-2xl tracking-tight text-ivory sm:text-3xl md:col-span-4">
          {t.bookingTitle}
        </h2>
        <p className="leading-7 text-ivory-muted md:col-span-8">
          {t.booking}
        </p>
      </section>

      <div className="mt-16 md:mt-20 lg:grid lg:grid-cols-12 lg:gap-12">
        <SectionIndex
          label={t.packages}
          items={tiers.map((tier) => ({
            id: tier.id,
            label: `${translateContent(locale, tier.name)} $${tier.pricePerPerson}`,
          }))}
          className="lg:col-span-3"
        />

        <div className="mt-10 divide-y divide-ivory/10 lg:col-span-9 lg:mt-0">
          {tiers.map((tier) => (
            <TierSection key={tier.id} tier={tier} locale={locale} />
          ))}

          <section className="pt-12">
            <h2 className="font-serif text-2xl tracking-tight text-ivory sm:text-3xl">
              {t.elseTitle}
            </h2>
            <p className="mt-4 max-w-prose leading-7 text-ivory-muted">
              {t.else}
            </p>
            <CallCta className="mt-8" />
          </section>
        </div>
      </div>
    </Container>
  );
}
