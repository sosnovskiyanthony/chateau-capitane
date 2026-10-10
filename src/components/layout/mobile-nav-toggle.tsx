"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";

import { BookCta } from "@/components/ui/book-cta";
import { focusRing } from "@/components/ui/styles";
import type { NavLink } from "@/lib/data/site";

export function MobileNavToggle({
  links,
  phone,
}: {
  links: readonly NavLink[];
  phone: { display: string; href: string };
}) {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();
  const toggle = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!open) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
      setOpen(false);
      // The focused link is about to be hidden; keep keyboard users on the menu button.
      toggle.current?.focus();
    };
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [open]);

  return (
    <div>
      <button
        ref={toggle}
        type="button"
        onClick={() => setOpen((value) => !value)}
        aria-expanded={open}
        aria-controls="mobile-nav"
        aria-label={open ? "Close menu" : "Open menu"}
        className={`-mr-2 inline-flex size-11 items-center justify-center text-ivory ${focusRing}`}
      >
        <svg
          width="24"
          height="24"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinecap="round"
          aria-hidden="true"
        >
          {open ? (
            <>
              <line x1="5" y1="5" x2="19" y2="19" />
              <line x1="19" y1="5" x2="5" y2="19" />
            </>
          ) : (
            <>
              <line x1="3" y1="7" x2="21" y2="7" />
              <line x1="3" y1="12" x2="21" y2="12" />
              <line x1="3" y1="17" x2="21" y2="17" />
            </>
          )}
        </svg>
      </button>

      <div
        id="mobile-nav"
        hidden={!open}
        className="absolute inset-x-0 top-full border-b border-gold/25 bg-ink-900"
      >
        <nav aria-label="Mobile" className="px-6 pb-6 pt-2 sm:px-8">
          <BookCta className="mb-2 mt-4 w-full" />
          <ul className="flex flex-col">
            {links.map((link) => {
              const current = pathname === link.href;
              return (
                <li key={link.href}>
                  <Link
                    href={link.href}
                    onClick={() => setOpen(false)}
                    aria-current={current ? "page" : undefined}
                    className={`flex min-h-14 items-center border-b border-ivory/10 font-serif text-2xl focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-gold ${
                      current ? "text-gold" : "text-ivory"
                    }`}
                  >
                    {link.label}
                  </Link>
                </li>
              );
            })}
          </ul>
          <a
            href={phone.href}
            className={`mt-4 inline-flex min-h-11 items-center font-semibold text-gold ${focusRing}`}
          >
            Call {phone.display}
          </a>
        </nav>
      </div>
    </div>
  );
}
