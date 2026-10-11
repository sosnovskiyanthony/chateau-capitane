import type { Metadata } from "next";

import { Container } from "@/components/layout/container";
import { CallCta } from "@/components/ui/call-cta";
import { CtaLink } from "@/components/ui/cta-link";
import { PageHeader } from "@/components/ui/page-header";
import { PlaceholderImage } from "@/components/ui/placeholder-image";
import { site } from "@/lib/data/site";
import { getDictionary } from "@/lib/i18n/dictionary";
import { getLocale } from "@/lib/i18n/get-locale";
import { pageMetadata } from "@/lib/metadata";

export async function generateMetadata(): Promise<Metadata> {
  const locale = await getLocale();
  const t = getDictionary(locale).meta;
  return pageMetadata({ locale, title: t.aboutTitle, description: t.aboutDescription, path: "/about" });
}

export default async function AboutPage() {
  const dict = getDictionary(await getLocale());
  const t = dict.about;
  return (
    <Container className="pb-20 pt-14 md:pb-28 md:pt-20">
      <div className="grid gap-12 md:grid-cols-12 md:items-center">
        <PageHeader
          eyebrow={t.eyebrow}
          title={t.title}
          intro={t.intro(site.name)}
          className="md:col-span-7"
        />

        <div className="md:col-span-4 md:col-start-9">
          <PlaceholderImage
            label={t.chefPhoto}
            aspect="aspect-3/4"
          />
        </div>
      </div>

      <div className="mt-20 grid gap-12 md:mt-28 md:grid-cols-12">
        <div className="md:col-span-7">
          <h2 className="font-serif text-3xl leading-tight tracking-tight text-ivory sm:text-4xl">
            {t.twoKitchens}
          </h2>
          <div className="mt-6 space-y-6 text-lg leading-8 text-ivory-muted">
            <p>{t.p1}</p>
            <p>{t.p2}</p>
          </div>
        </div>

        <aside className="grid min-w-0 gap-6 md:col-span-4 md:col-start-9">
          <PlaceholderImage
            label={t.roomPhoto}
            aspect="aspect-4/3"
          />
          <PlaceholderImage
            label={t.caviarPhoto}
            aspect="aspect-4/5"
            src="/photos/caviar-service-instagram.jpg"
          />
        </aside>
      </div>

      <figure className="mt-20 bg-ink-800 px-6 py-14 sm:px-14 sm:py-20 md:mt-28">
        <blockquote>
          <p className="max-w-4xl font-serif text-2xl italic leading-snug tracking-tight text-ivory sm:text-4xl">
            {t.quote}
          </p>
        </blockquote>
        <figcaption className="mt-8 text-xs font-semibold uppercase tracking-caps text-gold">
          {t.quoteBy}
        </figcaption>
      </figure>

      <div className="mt-20 max-w-2xl space-y-6 text-lg leading-8 text-ivory-muted md:mt-28">
        <p>{t.p3}</p>
        <p>{t.p4}</p>
      </div>

      <div className="mt-10 flex flex-wrap gap-3">
        <CtaLink href="/menu">{dict.cta.seeMenu}</CtaLink>
        <CallCta variant="secondary" />
      </div>
    </Container>
  );
}
