import { ctaClassName, type CtaVariant } from "@/components/ui/cta-class";
import { site } from "@/lib/data/site";
import { getDictionary } from "@/lib/i18n/dictionary";
import { getLocale } from "@/lib/i18n/get-locale";

export async function BookCta({
  variant = "primary",
  className = "",
}: {
  variant?: CtaVariant;
  className?: string;
}) {
  const t = getDictionary(await getLocale());
  return (
    <a
      href={site.reservationUrl}
      target="_blank"
      rel="noopener noreferrer"
      className={`${ctaClassName(variant)} ${className}`}
    >
      {t.cta.bookNow}
      <span className="sr-only">{t.cta.bookSr}</span>
    </a>
  );
}
