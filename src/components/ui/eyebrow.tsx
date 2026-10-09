import type { ReactNode } from "react";

/**
 * Tracked small capitals that label a heading or a group. Ivory rather than
 * gold, which is kept for large type. Render as a heading via `as` when the
 * label is the group's heading.
 */
export function Eyebrow({
  as: Tag = "p",
  children,
  className = "",
}: {
  as?: "p" | "h2" | "h3" | "dt" | "span";
  children: ReactNode;
  className?: string;
}) {
  return (
    <Tag
      className={`text-xs font-semibold uppercase tracking-caps text-ivory-muted ${className}`}
    >
      {children}
    </Tag>
  );
}
