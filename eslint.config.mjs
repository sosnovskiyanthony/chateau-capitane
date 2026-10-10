import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
    // Agent tooling — vendored skill/agent scripts, not application source.
    ".claude/**",
    ".agents/**",
    // Local package cache and generated PostgreSQL clusters are not source.
    ".npm-cache/**",
    ".local-db-tests/**",
  ]),
]);

export default eslintConfig;
