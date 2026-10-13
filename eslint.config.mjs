import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";
import prettier from "eslint-config-prettier/flat";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  {
    settings: {
      next: { rootDir: "packages/app/" },
    },
  },
  {
    rules: {
      "@typescript-eslint/no-explicit-any": "error",
      "@typescript-eslint/consistent-type-imports": ["error", { fixStyle: "inline-type-imports" }],
      "@typescript-eslint/no-unused-vars": [
        "error",
        { argsIgnorePattern: "^_", varsIgnorePattern: "^_" },
      ],
    },
  },
  // Generated shadcn/ui components are vendored code; keep them as generated.
  {
    files: ["packages/app/src/components/ui/**"],
    rules: { "@typescript-eslint/consistent-type-imports": "off" },
  },
  // Formatting is Prettier's job; this turns off conflicting stylistic rules.
  prettier,
  globalIgnores([
    "**/.next/**",
    "**/out/**",
    "**/build/**",
    "**/coverage/**",
    "**/next-env.d.ts",
    "packages/database/src/migrations/**",
  ]),
]);

export default eslintConfig;
