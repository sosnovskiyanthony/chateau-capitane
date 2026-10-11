"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { focusRing } from "@/components/ui/styles";
import type { NavLink } from "@/lib/data/site";
import { stripLocale } from "@/lib/i18n/locales";

export function NavLinks({ links, label }: { links: readonly NavLink[]; label: string }) {
  const pathname = usePathname();

  return (
    <nav aria-label={label} className="hidden lg:block">
      <ul className="flex items-center gap-1">
        {links.map((link) => {
          const current = stripLocale(pathname) === stripLocale(link.href);
          return (
            <li key={link.href}>
              <Link
                href={link.href}
                aria-current={current ? "page" : undefined}
                className={`relative inline-flex min-h-11 whitespace-nowrap items-center px-3 text-xs font-medium uppercase tracking-caps transition-colors ${focusRing} ${
                  current ? "text-gold" : "text-ivory-muted hover:text-ivory"
                }`}
              >
                {link.label}
                {current ? (
                  <span
                    aria-hidden="true"
                    className="absolute inset-x-3 bottom-1.5 h-px bg-gold"
                  />
                ) : null}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
