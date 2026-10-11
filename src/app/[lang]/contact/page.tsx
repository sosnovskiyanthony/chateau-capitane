import type { Metadata } from "next";
import Link from "next/link";

import { ContactForm } from "@/components/contact/contact-form";
import { ContactInfo } from "@/components/contact/contact-info";
import { MapEmbed } from "@/components/contact/map-embed";
import { Container } from "@/components/layout/container";
import { linkClasses } from "@/components/ui/styles";
import { PageHeader } from "@/components/ui/page-header";
import { BookCta } from "@/components/ui/book-cta";
import { formatHours, site } from "@/lib/data/site";
import { getDictionary } from "@/lib/i18n/dictionary";
import { getLocale } from "@/lib/i18n/get-locale";
import { translateContent } from "@/lib/i18n/dictionary";
import { localePath } from "@/lib/i18n/locales";
import { pageMetadata } from "@/lib/metadata";
import { getSiteContent } from "@/lib/server/content/content";

export async function generateMetadata(): Promise<Metadata> {
  const locale = await getLocale();
  const t = getDictionary(locale).meta;
  const { hours } = await getSiteContent();
  return pageMetadata({
    locale,
    title: t.contactTitle,
    description: t.contactDescription(site.address.full, formatHours(hours.dining, locale), site.phone.display),
    path: "/contact",
  });
}

export default async function ContactPage() {
  const locale = await getLocale();
  const dict = getDictionary(locale);
  const t = dict.contact;
  const { packages, hours, lunchSpecialPrice, menuNotes } = await getSiteContent();
  return (
    <Container className="pb-20 pt-14 md:pb-28 md:pt-20">
      <PageHeader
        eyebrow={t.eyebrow}
        title={t.title}
        intro={t.intro}
      />

      <BookCta className="mt-8" />

      <div className="mt-16 grid gap-16 md:mt-20 md:grid-cols-12 md:gap-12">
        <div className="md:col-span-7">
          <h2 className="font-serif text-2xl tracking-tight text-ivory sm:text-3xl">
            {t.sendTitle}
          </h2>
          <div className="mt-8">
            <ContactForm
              packages={packages.map((tier) => ({
                id: tier.id,
                label: dict.events.packageLabel(translateContent(locale, tier.name), tier.pricePerPerson),
              }))}
              strings={t.form}
            />
          </div>
        </div>

        <div className="bg-ink-800 px-6 py-10 sm:px-8 md:col-span-5 md:self-start">
          <h2 className="font-serif text-2xl tracking-tight text-ivory sm:text-3xl">
            {t.visitTitle}
          </h2>
          <ContactInfo columns={1} className="mt-8" />
          <div className="mt-10">
            <MapEmbed />
          </div>
        </div>
      </div>

      <section className="mt-16 max-w-3xl md:mt-20">
        <h2 className="font-serif text-2xl tracking-tight text-ivory sm:text-3xl">
          {t.faqTitle}
        </h2>
        <div className="mt-8 space-y-6 leading-7 text-ivory-muted">
          <div>
            <h3 className="text-lg text-ivory">{t.faqLunchQ}</h3>
            <p>
              {t.faqLunchA(lunchSpecialPrice, formatHours(hours.lunchSpecial, locale))}
            </p>
          </div>
          <div>
            <h3 className="text-lg text-ivory">{t.faqPartiesQ}</h3>
            <p>
              {t.faqPartiesBefore}
              <Link href={localePath(locale, "/private-events")} className={linkClasses}>
                {t.faqPartiesLink}
              </Link>
              {t.faqPartiesAfter(site.phone.display)}
            </p>
          </div>
          <div>
            <h3 className="text-lg text-ivory">{t.faqMinimumsQ}</h3>
            <ul className="list-inside list-disc">
              {menuNotes.map((note) => (
                <li key={note}>{translateContent(locale, note)}</li>
              ))}
            </ul>
          </div>
        </div>
      </section>
    </Container>
  );
}
