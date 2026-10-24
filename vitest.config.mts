import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

const shared = {
  resolve: {
    alias: [
      { find: /^@\//, replacement: fileURLToPath(new URL("./packages/app/src/", import.meta.url)) },
      {
        find: "server-only",
        replacement: fileURLToPath(new URL("./test/server-only-stub.ts", import.meta.url)),
      },
    ],
  },
};

/**
 * One Vitest config for the whole monorepo.
 * - unit:        fast, no external services (`*.test.ts`), 100% coverage gate
 * - integration: real PostgreSQL started by Testcontainers (`*.int.test.ts`)
 * - e2e:         production build + PostgreSQL container + agent-browser (`*.e2e.test.ts`);
 *                run `npm run build` first
 */
export default defineConfig({
  test: {
    coverage: {
      provider: "v8",
      include: ["packages/*/src/**/*.{ts,tsx}"],
      // Every exclusion needs a reason, and must be covered by another test layer
      // where it holds behaviour (ENGINEERING_STANDARDS.md, "Repository decisions").
      exclude: [
        // Tests and test data.
        "**/*.test.ts",
        "**/*.fixture.ts",
        // Test infrastructure (Testcontainers helpers and global setups).
        "packages/database/src/testing/**",
        // Generated code: migrations (reviewed SQL).
        "packages/database/src/migrations/**",
        // Design-system primitives built on shadcn/ui, without logic (class composition only).
        // Covered by the Storybook tests instead (interactions and a11y in both themes, CI job
        // `storybook`; design system POSTEP B1.27).
        "packages/app/src/components/ui/**",
        // Re-export barrels and type-only modules (no runtime behaviour).
        "**/index.ts",
        "**/*.port.ts",
        "**/*.d.ts",
        // Next.js page and layout components: covered by the e2e browser tests.
        // Logic used by a page lives in a colocated .ts module, which is covered here.
        "packages/app/src/app/**/page.tsx",
        "packages/app/src/app/**/layout.tsx",
        // DB CLI entry points need a live database; the integration and e2e setups run them.
        "packages/database/src/cli/**",
      ],
      thresholds: { lines: 100, branches: 100, functions: 100, statements: 100 },
      reporter: ["text", "html", "json-summary"],
    },
    projects: [
      {
        ...shared,
        test: {
          name: "unit",
          include: ["packages/*/src/**/*.test.ts"],
          exclude: ["**/*.int.test.ts", "**/*.e2e.test.ts", "**/node_modules/**"],
          environment: "node",
        },
      },
      {
        ...shared,
        test: {
          name: "integration",
          include: ["packages/*/src/**/*.int.test.ts"],
          environment: "node",
          globalSetup: ["packages/database/src/testing/integration.global-setup.ts"],
          testTimeout: 30_000,
          hookTimeout: 120_000,
          fileParallelism: false,
        },
      },
      {
        ...shared,
        test: {
          name: "e2e",
          include: ["packages/*/e2e/**/*.e2e.test.ts"],
          environment: "node",
          globalSetup: ["packages/app/e2e/support/e2e.global-setup.ts"],
          testTimeout: 60_000,
          hookTimeout: 60_000,
          fileParallelism: false,
        },
      },
    ],
  },
});
