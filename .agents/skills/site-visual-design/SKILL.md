---
name: site-visual-design
description: Design or improve restaurant pages using the established black-and-gold identity and verify responsive usability.
---

# Restaurant visual design with Codex

Research the target page and neighboring patterns before proposing a change. Read `docs/design.md` and inspect `globals.css`, the logo, typography, and existing shared components. For a requested redesign, identify specific usability or composition problems from the rendered site; distinguish observed problems from preferences.

Plan a content-led composition around the guest's task: finding food, evaluating a banquet, viewing the venue, or contacting the restaurant. Preserve the current identity unless the user requests a change. Prefer intentional hierarchy, readable type, coherent spacing, and authentic photography. Avoid forced layout randomization, generic bento grids, perpetual animations, decorative micro-labels, or dependency-heavy motion.

Build within the existing components and tokens. Give sections enough variety for their content without changing layout families purely to satisfy a count. Keep a clear primary action and expose real business information. Add useful focus, hover, loading, success, and error states where the interaction needs them.

Verify rendered changes at 375px, 768px, and 1280px, including navigation, headline wrapping, image crops, contrast, keyboard use, overflow, and reduced motion. Run lint/build for application edits. Report concrete outcomes with file references and material limitations.
