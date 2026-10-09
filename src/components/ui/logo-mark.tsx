import type { SVGProps } from "react";

/**
 * The brand mark: a captain's cap on an anchor with one loose turn of rope.
 * Flat geometry in `currentColor` with no masks or ids, so it can appear more
 * than once on a page and render in Satori (the share image). It takes full SVG
 * props, unlike ChartRose's `className`, because Satori ignores classes and
 * needs `width`/`height`/`color` set directly. `src/app/icon.svg` is a bolder
 * cut of the same drawing for the browser tab.
 */
export function LogoMark(props: SVGProps<SVGSVGElement>) {
  return (
    <svg
      viewBox="20 8 56 96"
      fill="currentColor"
      aria-hidden="true"
      focusable="false"
      {...props}
    >
      {/* Cap: crown with a knocked-out diamond badge, band, visor. */}
      <path
        fillRule="evenodd"
        d="M33 23.5C30.5 21.3 27.8 19 27.3 16.4C27 14.4 28.4 13.1 31 12.6C36 11.5 42 10.8 48 10.8C54 10.8 60 11.5 65 12.6C67.6 13.1 69 14.4 68.7 16.4C68.2 19 65.5 21.3 63 23.5ZM48 14.4L50.4 16.8L48 19.2L45.6 16.8Z"
      />
      <rect x="33" y="25" width="30" height="4" />
      <path d="M31 30.5H65C62.5 34 56 35.3 48 35.3C40 35.3 33.5 34 31 30.5Z" />

      {/* Anchor: the shank breaks where the rope passes in front of it. */}
      <rect x="46" y="36.8" width="4" height="21.5" />
      <rect x="46" y="63.7" width="4" height="31.8" />
      <path d="M22.6 69.5L22.6 81.2L30.1 78.5Z" />
      <path d="M73.4 69.5L73.4 81.2L65.9 78.5Z" />
      <path d="M44.4 94H51.6L48 101Z" />
      <g fill="none" stroke="currentColor" strokeWidth={4}>
        <path d="M34 46H62" strokeLinecap="round" />
        <path d="M26.4 79.9A23 23 0 0 0 69.6 79.9" />
      </g>

      {/* Rope: one loop whose back half stops short of the shank and whose front half crosses it, then a hanging tail. */}
      <g
        fill="none"
        stroke="currentColor"
        strokeWidth={2.2}
        strokeLinecap="round"
      >
        <path d="M35.62 58.74A12.5 4 -8 0 1 44.4 53.59" />
        <path d="M51.6 52.69A12.5 4 -8 0 1 60.38 55.26" />
        <path d="M60.38 55.26A12.5 4 -8 0 1 35.62 58.74" />
        <path d="M59.39 57.16C63 63 63.5 72 60.2 80.5" />
      </g>
    </svg>
  );
}
