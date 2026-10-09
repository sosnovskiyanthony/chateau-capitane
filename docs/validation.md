# Verification

Choose checks from the changed behavior. Commands run from the repository root in PowerShell or another supported shell. `npm test` runs the contact backend's Node tests with mocked email delivery; there is currently no automated browser-test dependency. Production build checks TypeScript separately from the focused test harness.

On Windows, if PowerShell blocks npm's `.ps1` wrappers, run `npm.cmd` and `npx.cmd` with the same arguments. No execution-policy change is required.

| Change | Required evidence |
| --- | --- |
| Documentation or agent configuration only | Check Markdown links, skill frontmatter, config syntax, deleted-path references, and scoped diff. No routine app build is needed unless verifying the migration baseline. |
| Application code, routes, data, styles, dependencies | `npm run lint` and `npm run build`, both successful. Add focused behavior checks where appropriate. |
| UI or interaction | Also inspect the changed route in a real browser at 375px, 768px, and 1280px; check keyboard use, focus, overflow, images, and console errors. |
| Metadata or new route | Check rendered title, description, canonical, Open Graph image, headings, links, and intended sitemap/robots behavior. Structured data must match visible facts. |
| Contact delivery | Run `npm test`: malformed/oversized input, field types, calendar dates, guests, honeypot, configuration, provider rejection/acknowledgment, timeout, and route wiring. Avoid sending real email merely to verify a UI change. |

`npm run build` performs compilation and TypeScript checks; Next.js 16 does not run ESLint as part of the build. Keep lint separate. `npx tsc --noEmit` is an optional targeted diagnostic after generated Next.js types exist, not an automatic third full check.

If dependencies are absent, use `npm ci` from the lockfile. Build may need network access for `next/font` downloads. On failure, distinguish application errors from missing dependencies, sandbox restrictions, or unavailable services. Report the exact outcome; a blocked check is not a pass.

The project browser MCP configuration lives in `.codex/config.toml`. It retains the previous Playwright server command. Codex must trust the project for project configuration to load, and first startup may download the server or require browser setup. Use an already available supported browser tool when appropriate. Do not reinstall a second browser harness by default.

Review only the task's diff, including new files. Preserve unrelated working-tree edits. After checks pass, stop repeating them unless another edit or unresolved issue warrants it. Do not add tests that only match documentation wording or mirror trivial implementation.
