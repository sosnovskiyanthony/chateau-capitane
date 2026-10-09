---
name: recreate-design-from-screenshot
description: Implement a supplied visual reference in this Next.js site and verify the rendered result against the reference.
---

# Recreate a reference with Codex

Research the supplied image, target viewport, current page, shared components, and relevant installed Next.js guides. If the image is inaccessible, request it before work that depends on seeing it. Read `docs/design.md`; an explicit user reference takes precedence over default aesthetic choices.

Plan the sections, typography, spacing, asset mapping, responsive behavior, and fidelity checks. Use the supplied reference directly; image generation is unnecessary unless the user requests new concepts or missing assets.

Build complete components in this existing Next.js/Tailwind v4 project. Reuse available assets and patterns. Do not introduce a Vite scaffold, second styling system, stock-photo hotlinks, or invented content. Preserve image aspect ratios and use `next/image` or `PlaceholderImage` appropriately.

Inspect the rendered route with an available browser tool at the reference viewport and at relevant mobile/desktop sizes. Compare hierarchy, alignment, spacing, wrapping, colors, crops, and interaction states. Fix visible mismatches and recheck the affected views until acceptance criteria are met. Avoid arbitrary fixed iteration counts or unsupported pixel-perfect claims. Run lint/build and report remaining fidelity limits if browser tools or assets are unavailable.
