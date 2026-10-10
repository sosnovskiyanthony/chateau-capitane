/** Class strings shared across forms, links and the admin pages. Keep each one identical everywhere it is used. */

export const focusRing =
  "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gold";

// ivory/45 keeps field borders above 3:1 against both ink-900 and ink-950.
export const fieldClasses =
  "mt-2.5 w-full border border-ivory/45 bg-ink-950 px-4 py-3 text-ivory focus-visible:border-gold focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-gold";

export const labelClasses =
  "block text-xs font-semibold uppercase tracking-caps text-ivory";

export const linkClasses = `underline decoration-gold/60 underline-offset-4 hover:text-gold-bright ${focusRing}`;
