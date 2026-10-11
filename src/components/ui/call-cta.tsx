import type { CtaVariant } from "@/components/ui/cta-class";
import { CtaLink } from "@/components/ui/cta-link";
import { site } from "@/lib/data/site";
import { getDictionary } from "@/lib/i18n/dictionary";
import { getLocale } from "@/lib/i18n/get-locale";

/**
 * Shared phone option for enquiries and banquet bookings.
 */
export async function CallCta({
  variant = "primary",
  className = "",
}: {
  variant?: CtaVariant;
  className?: string;
}) {
  const t = getDictionary(await getLocale());
  return (
    <CtaLink href={site.phone.href} variant={variant} className={className}>
      {t.cta.call(site.phone.display)}
    </CtaLink>
  );
}
