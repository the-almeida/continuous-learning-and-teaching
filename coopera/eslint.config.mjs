import js from "@eslint/js";
import nextPlugin from "@next/eslint-plugin-next";
import prettierConfig from "eslint-config-prettier";
import jestPlugin from "eslint-plugin-jest";
import prettierPlugin from "eslint-plugin-prettier";
import globals from "globals";
import tseslint from "typescript-eslint";

export default [
  {
    // Exclude generated and dependency folders from linting
    ignores: [
      "node_modules/**",
      ".next/**",
      ".git/**",
      "dist/**",
      "next-env.d.ts",
    ],
  },

  // Base JS/TS ESLint recommended rules
  js.configs.recommended,
  ...tseslint.configs.recommended,

  {
    // Infra scripts run in Node only
    files: ["infra/**/*.{js,ts}"],
    languageOptions: {
      globals: globals.node,
      sourceType: "module",
    },
  },

  {
    // Apply Next.js best practices and enforce Prettier formatting
    plugins: {
      "@next/next": nextPlugin,
      prettier: prettierPlugin,
    },
    rules: {
      "react/no-unescaped-entities": "off",
      "@next/next/no-html-link-for-pages": "error",
      "prettier/prettier": "error",
      "no-console": "warn",
    },
  },

  {
    // Jest-specific override for test files
    files: ["**/__tests__/**/*.{js,ts,tsx}", "**/*.{spec,test}.{js,ts,tsx}"],
    plugins: {
      jest: jestPlugin,
    },
    languageOptions: {
      globals: {
        ...jestPlugin.environments.globals.globals,
        console: "readonly",
        fetch: "readonly",
      },
    },
    rules: {
      ...jestPlugin.configs.recommended.rules,
    },
  },

  // Disable ESLint rules that conflict with Prettier formatting (keep last)
  prettierConfig,
];
