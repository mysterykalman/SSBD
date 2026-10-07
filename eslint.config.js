// Lint config (ESLint flat config). Run with `npm run lint`.
import js from "@eslint/js";
import globals from "globals";

export default [
  // src/client/sw.js is a template (%VERSION%, %PRECACHE%) filled in by scripts/build.mjs.
  {ignores: ["dist/**", "reference/**", "node_modules/**", ".dev-data/**", "src/client/sw.js"]},
  js.configs.recommended,
  {
    languageOptions: {ecmaVersion: 2023, sourceType: "module"},
    rules: {
      "no-unused-vars": ["error", {argsIgnorePattern: "^_", varsIgnorePattern: "^_", destructuredArrayIgnorePattern: "^_", caughtErrors: "none"}],
      "no-empty": ["error", {allowEmptyCatch: true}],
      // French typography uses narrow no-break spaces inside strings and regexes on purpose.
      "no-irregular-whitespace": ["error", {skipStrings: true, skipTemplates: true, skipRegExps: true}]
    }
  },
  // Shared game logic runs in both the browser and the Worker.
  {files: ["src/shared/**/*.js"], languageOptions: {globals: {...globals.browser}}},
  {files: ["src/server/**/*.js"], languageOptions: {globals: {...globals.serviceworker}}},
  {files: ["src/client/**/*.js"], languageOptions: {globals: {...globals.browser}}},
  {files: ["scripts/**/*.mjs", "test/**/*.mjs", "eslint.config.js"], languageOptions: {globals: {...globals.node}}},
  // Playwright page.evaluate callbacks run in the browser.
  // Follow-up: test/e2e/family.test.mjs has an unused `name` parameter; drop this relaxation once it is fixed.
  {files: ["test/e2e/**/*.mjs"], languageOptions: {globals: {...globals.node, ...globals.browser}}, rules: {"no-unused-vars": ["error", {args: "none", varsIgnorePattern: "^_", caughtErrors: "none"}]}}
];
