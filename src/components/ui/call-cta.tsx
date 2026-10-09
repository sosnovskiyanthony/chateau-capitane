import { CtaLink, type CtaVariant } from "@/components/ui/cta-link";
import { site } from "@/lib/data/site";

/**
 * Shared phone option for enquiries and banquet bookings.
 */
export function CallCta({
  variant = "primary",
  className = "",
}: {
  variant?: CtaVariant;
  className?: string;
}) {
  return (
    <CtaLink href={site.phone.href} variant={variant} className={className}>
      Call {site.phone.display}
    </CtaLink>
  );
}
