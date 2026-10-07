// Lint config (ESLint flat config). Run with `npm run lint`.
import js from "@eslint/js";
import globals from "globals";

export default [
  {ignores: ["dist/**", "reference/**", "node_modules/**", ".dev-data/**"]},
  js.configs.recommended,
  {
    languageOptions: {ecmaVersion: 2023, sourceType: "module"},
    rules: {
      "no-unused-vars": ["error", {argsIgnorePattern: "^_", varsIgnorePattern: "^_", destructuredArrayIgnorePattern: "^_", caughtErrors: "none"}],
      "no-empty": ["error", {allowEmptyCatch: true}]
    }
  },
  // Shared game logic runs in both the browser and the Worker.
  {files: ["src/shared/**/*.js"], languageOptions: {globals: {...globals.browser}}},
  {files: ["src/server/**/*.js"], languageOptions: {globals: {...globals.serviceworker}}},
  {files: ["src/client/**/*.js"], languageOptions: {globals: {...globals.browser}}},
  {files: ["src/client/sw.js"], languageOptions: {globals: {...globals.serviceworker}}},
  {files: ["scripts/**/*.mjs", "test/**/*.mjs", "eslint.config.js"], languageOptions: {globals: {...globals.node}}},
  // Playwright page.evaluate callbacks run in the browser.
  {files: ["test/e2e/**/*.mjs"], languageOptions: {globals: {...globals.node, ...globals.browser}}}
];
