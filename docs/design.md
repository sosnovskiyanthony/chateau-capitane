# Site design

The owner chose black and gold. Preserve the established restaurant identity unless the user explicitly requests a new direction. Tokens in `src/app/globals.css` and working components are the implementation source of truth.

- One mid-dark theme: neutral near-black `ink-900` ground, `ink-800` raised panels, `ink-950` footer. No pure black, light section bands, or theme toggle. Avoid warming the ink toward brown.
- Ivory and muted ivory text. Gold accents belong to large type, CTAs, focus rings, the logo, and lunch-card rules. Body text needs at least 4.5:1 contrast on its actual background; field borders need at least 3:1.
- Bodoni Moda headings at regular weight and Albert Sans body through `next/font`. No third family. Reuse `Eyebrow` for tracked small-cap labels in ivory when they carry useful information.
- Square corners, no shadows or gradients. Group through spacing and tonal surfaces before borders. Use the existing Tailwind spacing scale; arbitrary pixel values require a concrete reference need.
- `LogoMark` is the captain's cap, anchor, and loose rope. Keep its proportions and flat gold treatment. The browser icon is the bolder version without rope. Do not stretch, outline, or embellish either.
- The chart rose belongs once in the home hero. Its hero animation is the only automatic motion. Other interactions respond to user action and respect reduced motion.
- Use real restaurant photography. `PlaceholderImage` accepts `src` without changing its layout; keep useful placeholders where a real asset is absent. Write specific alt text, with empty alt for purely decorative images. Do not present generated scenes as real venue photographs.
- Copy is elegant, warm, and concise. Avoid invented claims, marketing filler, and em dashes in site copy.
- Mobile-first layouts. Verify changed UI at 375px, 768px, and 1280px. Check headline wrapping, navigation, image crops, keyboard focus, and horizontal overflow.

Reuse `PageHeader`, `SectionHeading`, `Eyebrow`, CTA components, existing menu/event sections, and shared navigation where applicable. New visual work should serve the page's content and guest action; avoid repetitive decorative labels, nested card wrappers, or adding an animation library for ordinary interactions.
