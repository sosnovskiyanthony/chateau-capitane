"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

type NavLink = { readonly href: string; readonly label: string };

export function MobileNavToggle({
  links,
  phone,
}: {
  links: readonly NavLink[];
  phone: { display: string; href: string };
}) {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!open) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [open]);

  return (
    <div className="md:hidden">
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        aria-expanded={open}
        aria-controls="mobile-nav"
        aria-label={open ? "Close menu" : "Open menu"}
        className="-mr-2 inline-flex items-center justify-center rounded p-2 text-stone-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-wine-700"
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
        className="absolute inset-x-0 top-full border-b border-stone-200 bg-stone-50 shadow-sm"
      >
        <nav aria-label="Mobile" className="px-6 py-4">
          <ul className="flex flex-col">
            {links.map((link) => (
              <li key={link.href}>
                <Link
                  href={link.href}
                  onClick={() => setOpen(false)}
                  className="block border-b border-stone-200 py-3 font-serif text-lg text-stone-800 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-wine-700"
                >
                  {link.label}
                </Link>
              </li>
            ))}
          </ul>
          <a
            href={phone.href}
            className="mt-4 inline-block font-medium text-wine-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-wine-700"
          >
            {phone.display}
          </a>
        </nav>
      </div>
    </div>
  );
}
