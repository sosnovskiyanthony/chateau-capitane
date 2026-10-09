import type { ReactNode } from "react";

import { Eyebrow } from "@/components/ui/eyebrow";

/** Top of an inner page: an optional label, the page's one h1, a lead, and optional actions. */
export function PageHeader({
  eyebrow,
  title,
  intro,
  children,
  className = "",
}: {
  eyebrow?: ReactNode;
  title: ReactNode;
  intro?: ReactNode;
  /** Call-to-action links, laid out in a wrapping row under the lead. */
  children?: ReactNode;
  className?: string;
}) {
  return (
    <header className={`max-w-3xl ${className}`}>
      {eyebrow ? <Eyebrow className="mb-5">{eyebrow}</Eyebrow> : null}
      <h1 className="font-serif text-5xl leading-display tracking-tight text-ivory sm:text-6xl">
        {title}
      </h1>
      {intro ? (
        <p className="mt-6 max-w-xl text-lg leading-8 text-ivory-muted">
          {intro}
        </p>
      ) : null}
      {children ? (
        <div className="mt-10 flex flex-wrap gap-3">{children}</div>
      ) : null}
    </header>
  );
}
