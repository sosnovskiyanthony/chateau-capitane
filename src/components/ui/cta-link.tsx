import Link from "next/link";
import type { ReactNode } from "react";

const styles = {
  primary:
    "bg-wine-700 text-stone-50 hover:bg-wine-800 focus-visible:outline-wine-700",
  secondary:
    "border border-stone-400 text-stone-800 hover:border-stone-900 hover:text-stone-900 focus-visible:outline-stone-700",
} as const;

export function CtaLink({
  href,
  children,
  variant = "primary",
  className = "",
}: {
  href: string;
  children: ReactNode;
  variant?: keyof typeof styles;
  className?: string;
}) {
  const classes = `inline-flex items-center justify-center px-6 py-3 text-sm font-medium transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 ${styles[variant]} ${className}`;

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
