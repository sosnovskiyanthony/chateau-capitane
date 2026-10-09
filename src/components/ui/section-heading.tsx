import type { ReactNode } from "react";

import { Eyebrow } from "@/components/ui/eyebrow";

export function SectionHeading({
  children,
  eyebrow,
  intro,
  className = "",
}: {
  children: ReactNode;
  eyebrow?: ReactNode;
  intro?: ReactNode;
  className?: string;
}) {
  return (
    <div className={`max-w-2xl ${className}`}>
      {eyebrow ? <Eyebrow className="mb-5">{eyebrow}</Eyebrow> : null}
      <h2 className="font-serif text-4xl leading-display tracking-tight text-ivory sm:text-5xl">
        {children}
      </h2>
      {intro ? (
        <p className="mt-5 text-lg leading-8 text-ivory-muted">{intro}</p>
      ) : null}
    </div>
  );
}
