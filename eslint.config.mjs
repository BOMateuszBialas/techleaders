import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";
import prettier from "eslint-config-prettier/flat";

const FRAMEWORK = ["next", "next/*", "react", "react/*", "react-dom", "react-dom/*"];
const INFRASTRUCTURE = ["@mikro-orm/*", "awilix"];
/** LLM vendor SDKs: only the adapters in `packages/ai/src/adapters/` may import them. */
const LLM_SDKS = ["@google/genai", "@google/genai/*"];
const LLM_SDK_MESSAGE =
  "Only an LLM adapter (packages/ai/src/adapters/) may import a provider SDK; use LlmProviderPort.";

/** One `no-restricted-imports` pattern group with the reason shown in the lint error. */
function restrict(group, message) {
  return { group, message };
}

const AI_BOUNDARIES = [
  restrict(FRAMEWORK, "ai must not depend on Next.js or React."),
  restrict(
    [...INFRASTRUCTURE, "@commerceos/database", "@commerceos/app"],
    "ai reaches data only through core application services and ports.",
  ),
];

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
  // Package boundaries (ENGINEERING_STANDARDS.md, "Repository decisions").
  {
    files: ["packages/core/src/**"],
    rules: {
      "no-restricted-imports": [
        "error",
        {
          patterns: [
            restrict(FRAMEWORK, "core is framework-free: no Next.js or React."),
            restrict(
              INFRASTRUCTURE,
              "core must not use the ORM or DI container; depend on a port instead.",
            ),
            restrict(["@commerceos/*"], "core depends on no other workspace package."),
            restrict(LLM_SDKS, LLM_SDK_MESSAGE),
          ],
        },
      ],
    },
  },
  {
    files: ["packages/database/src/**"],
    rules: {
      "no-restricted-imports": [
        "error",
        {
          patterns: [
            restrict(FRAMEWORK, "database must not depend on Next.js or React."),
            restrict(["@commerceos/app", "@commerceos/ai"], "database may depend on core only."),
            restrict(LLM_SDKS, LLM_SDK_MESSAGE),
          ],
        },
      ],
    },
  },
  // Two non-overlapping blocks (a later block would replace the earlier one's options): only
  // the adapters may import a provider SDK.
  {
    files: ["packages/ai/src/**"],
    ignores: ["packages/ai/src/adapters/**"],
    rules: {
      "no-restricted-imports": [
        "error",
        { patterns: [...AI_BOUNDARIES, restrict(LLM_SDKS, LLM_SDK_MESSAGE)] },
      ],
    },
  },
  {
    files: ["packages/ai/src/adapters/**"],
    rules: { "no-restricted-imports": ["error", { patterns: AI_BOUNDARIES }] },
  },
  {
    files: ["packages/app/src/**"],
    ignores: ["packages/app/src/server/container.ts", "packages/app/src/server/container.test.ts"],
    rules: {
      "no-restricted-imports": [
        "error",
        {
          patterns: [
            restrict(
              ["@commerceos/database", "@mikro-orm/*"],
              "Only the composition root (src/server/container.ts) may use the database package; resolve a use case from the request scope instead.",
            ),
            restrict(LLM_SDKS, LLM_SDK_MESSAGE),
          ],
        },
      ],
    },
  },
  // The eval set and scripted models are test code: app tests may use them, production code
  // never. A separate rule name, so the boundary block above keeps its own options.
  {
    files: ["packages/app/src/**"],
    ignores: ["**/*.test.ts", "**/*.test.tsx"],
    rules: {
      "@typescript-eslint/no-restricted-imports": [
        "error",
        {
          paths: [
            {
              name: "@commerceos/ai/evals",
              message: "Scripted models and eval cases are for tests only; use LlmProviderPort.",
            },
          ],
        },
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
