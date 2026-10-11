import type { Metadata } from "next";

import { Container } from "@/components/layout/container";
import { CallCta } from "@/components/ui/call-cta";
import { CtaLink } from "@/components/ui/cta-link";
import { PageHeader } from "@/components/ui/page-header";
import { getDictionary } from "@/lib/i18n/dictionary";
import { getLocale } from "@/lib/i18n/get-locale";

export async function generateMetadata(): Promise<Metadata> {
  return { title: getDictionary(await getLocale()).meta.notFoundTitle };
}

export default async function NotFound() {
  const t = getDictionary(await getLocale());
  return (
    <Container className="py-24 md:py-32">
      <PageHeader
        eyebrow={t.notFound.title}
        title={t.notFound.heading}
        intro={t.notFound.intro}
      >
        <CtaLink href="/menu">{t.cta.seeMenu}</CtaLink>
        <CtaLink href="/private-events" variant="secondary">
          {t.cta.seeBanquets}
        </CtaLink>
        <CallCta variant="secondary" />
      </PageHeader>
    </Container>
  );
}
