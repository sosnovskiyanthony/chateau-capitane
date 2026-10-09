import Link from "next/link";
import type { ReactNode } from "react";

const styles = {
  primary: "bg-gold text-ink-950 hover:bg-gold-bright active:bg-gold-deep",
  secondary:
    "border border-gold/60 text-ivory hover:border-gold hover:text-gold-bright",
} as const;

export type CtaVariant = keyof typeof styles;

/** Shared with the contact form's submit button so every call to action matches. */
export function ctaClassName(variant: CtaVariant = "primary"): string {
  return `inline-flex min-h-12 items-center justify-center whitespace-nowrap px-7 text-xs font-semibold uppercase tracking-caps transition-[background-color,border-color,color,translate] duration-200 active:translate-y-px focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gold ${styles[variant]}`;
}

export function CtaLink({
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
      <Link href={href} className={classes}>
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
