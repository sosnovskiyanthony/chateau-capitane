import type { ReactNode } from "react";

export function SectionHeading({
  children,
  intro,
  className = "",
}: {
  children: ReactNode;
  intro?: ReactNode;
  className?: string;
}) {
  return (
    <div className={`max-w-2xl ${className}`}>
      <h2 className="font-serif text-3xl leading-tight text-stone-900 sm:text-4xl">
        {children}
      </h2>
      {intro ? (
        <p className="mt-4 text-lg leading-8 text-stone-600">{intro}</p>
      ) : null}
    </div>
  );
}
