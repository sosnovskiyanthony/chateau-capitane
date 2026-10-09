import { ctaClassName, type CtaVariant } from "@/components/ui/cta-link";
import { site } from "@/lib/data/site";

export function BookCta({
  variant = "primary",
  className = "",
}: {
  variant?: CtaVariant;
  className?: string;
}) {
  return (
    <a
      href={site.reservationUrl}
      target="_blank"
      rel="noopener noreferrer"
      className={`${ctaClassName(variant)} ${className}`}
    >
      Book now
      <span className="sr-only"> on OpenTable (opens in a new tab)</span>
    </a>
  );
}
