---
name: recreate-design-from-screenshot
description: Recreate a reference screenshot as a Next.js page/component in this project, iterating with screenshot comparisons until pixel-close. Use when the user provides a reference image (and optionally CSS classes or style notes) and wants it built or matched in the site.
---

# Recreate Design From Screenshot

## Workflow

1. **Generate** the page or component as a Next.js Server Component under `src/app/`, using this project's Tailwind CSS setup (no CDN — Tailwind is already configured via `postcss.config.mjs`/`globals.css`). Follow the conventions in `CLAUDE.md` (metadata export, `next/image`, semantic HTML).
2. **Screenshot** the rendered page. Run `npm run dev`, then capture the route with Puppeteer or Playwright (whichever is available) at the relevant viewport(s). If the page has distinct sections, capture those individually too.
3. **Compare** your screenshot against the reference image. Check for mismatches in:
   - Spacing and padding (measure in px)
   - Font sizes, weights, and line heights
   - Colors (exact hex values)
   - Alignment and positioning
   - Border radii, shadows, and effects
   - Responsive behavior (mobile + desktop)
   - Image/icon sizing and placement
4. **Fix** every mismatch found by editing the component.
5. **Re-screenshot** and compare again.
6. **Repeat** steps 3–5 until the result is within ~2–3px of the reference everywhere.

Do NOT stop after one pass. Always do at least 2 comparison rounds. Only stop when the user says so or when no visible differences remain.

## Technical defaults

- Use this project's existing Tailwind setup — do not add a CDN script or a second styling system.
- Use `next/image` with real `src`/`width`/`height`; use placeholders from `https://placehold.co/` only when the user hasn't supplied source images, and flag them as placeholders to swap out later.
- Mobile-first responsive design.
- Reuse existing shared components/layout where they already exist instead of duplicating markup.

## Rules

- Do not add features, sections, or content not present in the reference image.
- Match the reference exactly — do not "improve" the design unprompted.
- If the user provides CSS classes or style tokens, use them verbatim.
- Keep code clean but don't over-abstract — inline Tailwind classes are fine.
- When comparing screenshots, be specific about what's wrong (e.g., "heading is 32px but reference shows ~24px", "gap between cards is 16px but should be 24px").
