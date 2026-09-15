import js from "@eslint/js";
import svelte from "eslint-plugin-svelte";
import prettier from "eslint-config-prettier";
import globals from "globals";
import tseslint from "typescript-eslint";
import svelteConfig from "./svelte.config.js";

/** @type {import('eslint').Linter.Config[]} */
export default [
  { ignores: [".svelte-kit/**", "build/**", "node_modules/**", "static/**"] },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  ...svelte.configs.recommended,
  prettier,
  ...svelte.configs.prettier,
  {
    languageOptions: {
      globals: { ...globals.browser, ...globals.node }
    },
    rules: {
      // Konvensi standar: prefix `_` (dan `_unused`) menandai variabel/arg sengaja tak dipakai.
      "@typescript-eslint/no-unused-vars": [
        "error",
        { argsIgnorePattern: "^_", varsIgnorePattern: "^_", caughtErrorsIgnorePattern: "^_" }
      ]
    }
  },
  {
    files: ["**/*.svelte", "**/*.svelte.js", "**/*.svelte.ts"],
    languageOptions: {
      parserOptions: {
        parser: tseslint.parser,
        extraFileExtensions: [".svelte"],
        svelteConfig
      }
    },
    rules: {
      // Href internal dibungkus terpusat lewat `resolveHref()` ($lib/utils) yang memanggil resolve(),
      // jadi rule ini tidak perlu memeriksa tiap literal <a href>.
      "svelte/no-navigation-without-resolve": "off"
    }
  }
];
