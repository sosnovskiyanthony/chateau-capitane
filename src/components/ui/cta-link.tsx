import Link from "next/link";
import type { ReactNode } from "react";

import { getLocale } from "@/lib/i18n/get-locale";
import { localePath } from "@/lib/i18n/locales";
import { ctaClassName, type CtaVariant } from "@/components/ui/cta-class";

export async function CtaLink({
  href,
  children,
  variant = "primary",
  className = "",
}: {
  href: string;
  children: ReactNode;
  variant?: CtaVariant;
  className?: string;
}) {
  const classes = `${ctaClassName(variant)} ${className}`;

  if (href.startsWith("/")) {
    return (
      <Link href={localePath(await getLocale(), href)} className={classes}>
        {children}
      </Link>
    );
  }

  return (
    <a href={href} className={classes}>
      {children}
    </a>
  );
}
