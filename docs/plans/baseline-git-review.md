# Proposed baseline Git checkpoint

Updated: 2026-10-09. **Local baseline commit approved by the owner; push and deployment remain unauthorized.**

## Proposed action

Create local branch `codex/backend-foundation` from the current `main` without discarding the working tree. Stage the explicit manifest below, review the staged patch, and create:

`Migrate project workflow to Codex and establish backend foundation`

If separately or jointly authorized, push that branch to `origin` at `https://github.com/sosnovskiyanthony/chateau-capitane`. Do not push to main, merge, force-push, rewrite history or deploy. Verify whether this repository has automatic preview deployments before an actual push; connected preview behavior is currently unknown. If a push would cause an unauthorized production deployment, resolve that before pushing.

Scope includes accumulated website design/content/assets, the prior Claude-to-Codex migration, initial contact backend and retry protection, B01 validation extraction/tests, and planning/handoff documentation. This preserves prior requested work as one usable baseline rather than attempting to commit an extraction whose source files are still untracked.

## Review evidence and limits

- Current B01 source reviewed against its pre-slice snapshot: validation extracted; configuration and delivery code byte-for-byte unchanged.
- All **43/43 mocked tests**, lint and production build passed on 2026-10-09. The sandbox's initial test-worker failure was resolved by approved escalation. Existing parent-directory lockfile build warning remains.
- Tracked diff whitespace check passed. Reviewed tracked/untracked inventory; a limited recognizable-secret pattern scan found no matches in 96 changed text files. This is not a security audit or guarantee that all sensitive material is detected.
- `.env.example` contains a blank API key and placeholder sender; `.env.local`, `.next` and `node_modules` are ignored. No actual local environment contents were read for this review.
- Font files have OFL license documents. Photo provenance is in [photo-sources.md](../photo-sources.md); earlier assets remain unchanged by B01.
- Earlier responsive UI/photo checks are recorded in project notes; B01 changed no UI and did not repeat those browser checks. No live email, database, production deployment or real reservation was tested.
- Recheck current status and staged diff before committing: later user edits may change this manifest. Preserve all files outside the explicitly approved scope.

## Explicit manifest

116 paths, including deletions. `D` = deletion; `M` = modified; `??` = new/untracked. Counts include this review document.

### Codex migration and root instructions (27)

- `D .claude/agents/plan-reviewer.md`
- `D .claude/agents/plan-synthesizer.md`
- `D .claude/agents/seo-reviewer.md`
- `D .claude/agents/unbiased-code-reviewer.md`
- `D .claude/agents/visual-qa-reviewer.md`
- `D .claude/agents/web-design-researcher.md`
- `D .claude/rules/design-rules.md`
- `D .claude/rules/technical-defaults.md`
- `D .claude/rules/workflow.md`
- `D .claude/skills/frontend-design/SKILL.md`
- `D .claude/skills/new-page/SKILL.md`
- `D .claude/skills/recreate-design-from-screenshot/SKILL.md`
- `D .claude/skills/web-design-guidelines/SKILL.md`
- `M .gitignore`
- `D .mcp.json`
- `M AGENTS.md`
- `D CLAUDE.md`
- `M README.md`
- `?? .agents/skills/brand-assets/SKILL.md`
- `?? .agents/skills/handoff/SKILL.md`
- `?? .agents/skills/new-page/SKILL.md`
- `?? .agents/skills/recreate-design-from-screenshot/SKILL.md`
- `?? .agents/skills/site-visual-design/SKILL.md`
- `?? .codex/config.toml`
- `?? HANDOFF.md`
- `?? PLANS.md`
- `?? next.md`

### Backend, tests and configuration (6)

- `M package.json`
- `?? .env.example`
- `?? src/app/api/contact/route.ts`
- `?? src/lib/server/contact.ts`
- `?? src/lib/server/inquiries/contact-input.ts`
- `?? tests/contact.test.mjs`

### Website source and assets (68)

- `D public/file.svg`
- `D public/globe.svg`
- `D public/next.svg`
- `D public/vercel.svg`
- `D public/window.svg`
- `M src/app/about/page.tsx`
- `M src/app/contact/page.tsx`
- `D src/app/favicon.ico`
- `M src/app/gallery/page.tsx`
- `M src/app/globals.css`
- `M src/app/layout.tsx`
- `M src/app/menu/page.tsx`
- `M src/app/not-found.tsx`
- `M src/app/opengraph-image.tsx`
- `M src/app/page.tsx`
- `M src/app/private-events/page.tsx`
- `M src/app/testimonials/page.tsx`
- `M src/components/contact/contact-form.tsx`
- `M src/components/contact/contact-info.tsx`
- `M src/components/contact/map-embed.tsx`
- `M src/components/gallery/photo-grid.tsx`
- `M src/components/home/hero.tsx`
- `M src/components/home/lunch-special.tsx`
- `M src/components/home/private-events-teaser.tsx`
- `M src/components/home/signature-dishes.tsx`
- `M src/components/layout/footer.tsx`
- `M src/components/layout/header.tsx`
- `M src/components/layout/mobile-nav-toggle.tsx`
- `D src/components/menu/menu-category-nav.tsx`
- `M src/components/menu/menu-item.tsx`
- `M src/components/menu/menu-section.tsx`
- `D src/components/private-events/tier-nav.tsx`
- `M src/components/private-events/tier-section.tsx`
- `M src/components/restaurant-schema.tsx`
- `M src/components/testimonials/testimonial-card.tsx`
- `M src/components/ui/cta-link.tsx`
- `M src/components/ui/placeholder-image.tsx`
- `M src/components/ui/section-heading.tsx`
- `M src/lib/data/gallery.ts`
- `M src/lib/data/menu.ts`
- `M src/lib/data/private-events.ts`
- `M src/lib/data/site.ts`
- `M src/lib/metadata.ts`
- `?? assets/fonts/AlbertSans-Regular.ttf`
- `?? assets/fonts/BodoniModa-Display.ttf`
- `?? assets/fonts/OFL-AlbertSans.txt`
- `?? assets/fonts/OFL-BodoniModa.txt`
- `?? public/photos/borscht.jpg`
- `?? public/photos/caviar-service-instagram.jpg`
- `?? public/photos/chicken-tabaka.jpg`
- `?? public/photos/entrance-night.jpg`
- `?? public/photos/kebabs-grill.jpg`
- `?? public/photos/lobster-platter-instagram.jpg`
- `?? public/photos/mixed-pickles.jpg`
- `?? public/photos/red-caviar.jpg`
- `?? public/photos/roasted-duck.jpg`
- `?? public/photos/tomahawk-steak.jpg`
- `?? src/app/apple-icon.tsx`
- `?? src/app/icon.svg`
- `?? src/components/layout/nav-links.tsx`
- `?? src/components/ui/book-cta.tsx`
- `?? src/components/ui/call-cta.tsx`
- `?? src/components/ui/chart-rose.tsx`
- `?? src/components/ui/eyebrow.tsx`
- `?? src/components/ui/leader.tsx`
- `?? src/components/ui/logo-mark.tsx`
- `?? src/components/ui/page-header.tsx`
- `?? src/components/ui/section-index.tsx`

### Documentation and benchmark summaries (15)

- `?? benchmarks/token-savings/2026-10-08-context/results.json`
- `?? benchmarks/token-savings/2026-10-08-context/summary.json`
- `?? benchmarks/token-savings/2026-10-08/results.json`
- `?? docs/backend.md`
- `?? docs/codex-workflow.md`
- `?? docs/design.md`
- `?? docs/photo-sources.md`
- `?? docs/plans/backend-roadmap.md`
- `?? docs/plans/contact-backend.md`
- `?? docs/research.md`
- `?? docs/technical.md`
- `?? docs/token-benchmark.md`
- `?? docs/validation.md`
- `?? scripts/benchmark-codex-tokens.py`
- `?? docs/plans/baseline-git-review.md`

## Left local, outside this proposal

20 raw benchmark trace/log files are excluded pending a separate publication review. Summaries, reproducibility script and measurement documentation are included. No files are deleted and ignore rules are unchanged.

- `benchmarks/token-savings/2026-10-08-context/current-1.jsonl`
- `benchmarks/token-savings/2026-10-08-context/current-1.stderr.txt`
- `benchmarks/token-savings/2026-10-08-context/current-2.jsonl`
- `benchmarks/token-savings/2026-10-08-context/current-2.stderr.txt`
- `benchmarks/token-savings/2026-10-08-context/current-3.jsonl`
- `benchmarks/token-savings/2026-10-08-context/current-3.stderr.txt`
- `benchmarks/token-savings/2026-10-08-context/legacy-1.jsonl`
- `benchmarks/token-savings/2026-10-08-context/legacy-1.stderr.txt`
- `benchmarks/token-savings/2026-10-08-context/legacy-2.jsonl`
- `benchmarks/token-savings/2026-10-08-context/legacy-2.stderr.txt`
- `benchmarks/token-savings/2026-10-08-context/legacy-3.jsonl`
- `benchmarks/token-savings/2026-10-08-context/legacy-3.stderr.txt`
- `benchmarks/token-savings/2026-10-08/current-1.jsonl`
- `benchmarks/token-savings/2026-10-08/current-1.stderr.txt`
- `benchmarks/token-savings/2026-10-08/current-2.jsonl`
- `benchmarks/token-savings/2026-10-08/current-2.stderr.txt`
- `benchmarks/token-savings/2026-10-08/current-3.jsonl`
- `benchmarks/token-savings/2026-10-08/current-3.stderr.txt`
- `benchmarks/token-savings/2026-10-08/legacy-3.jsonl`
- `benchmarks/token-savings/2026-10-08/legacy-3.stderr.txt`

## Authorization record

Commit: authorized 2026-10-09 by the owner's “yes” to the local baseline commit on `codex/backend-foundation`. Approval covers the explicit manifest and excludes the raw benchmark logs above. Branch created locally. This authorization record is included in the baseline commit; use `git log -1 --oneline` and `git status --short` to verify execution/current state.

Push: not authorized. Deployment: not authorized. Do not treat local commit approval as either.
