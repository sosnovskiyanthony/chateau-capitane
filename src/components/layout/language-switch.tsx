"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { focusRing } from "@/components/ui/styles";
import { localePath, stripLocale } from "@/lib/i18n/locales";

type Other = { code: "en" | "ru"; short: string; name: string; title: string };

/** Sends the visitor to the same page in the other language (the part after # or ? is dropped). */
export function LanguageSwitch({ other, className = "" }: { other: Other; className?: string }) {
  const pathname = usePathname();
  const href = localePath(other.code, stripLocale(pathname));

  return (
    <Link
      href={href}
      hrefLang={other.code}
      lang={other.code}
      title={other.title}
      aria-label={`${other.name} (${other.short})`}
      className={`inline-flex min-h-11 items-center justify-center border border-gold/40 px-2.5 text-xs font-semibold uppercase tracking-caps text-ivory transition-colors hover:border-gold hover:text-gold-bright ${focusRing} ${className}`}
    >
      {other.short}
    </Link>
  );
}
