"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

type NavLink = { readonly href: string; readonly label: string };

export function NavLinks({ links }: { links: readonly NavLink[] }) {
  const pathname = usePathname();

  return (
    <nav aria-label="Main" className="hidden lg:block">
      <ul className="flex items-center gap-1">
        {links.map((link) => {
          const current = pathname === link.href;
          return (
            <li key={link.href}>
              <Link
                href={link.href}
                aria-current={current ? "page" : undefined}
                className={`relative inline-flex min-h-11 items-center px-3 text-xs font-medium uppercase tracking-caps transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gold ${
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
