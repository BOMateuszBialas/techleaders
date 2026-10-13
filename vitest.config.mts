import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

const shared = {
  resolve: {
    alias: {
      "@/": fileURLToPath(new URL("./packages/app/src/", import.meta.url)),
      "server-only": fileURLToPath(new URL("./test/server-only-stub.ts", import.meta.url)),
    },
  },
};

/**
 * One Vitest config for the whole monorepo.
 * - unit:        fast, no external services (`*.test.ts`)
 * - integration: needs PostgreSQL from docker compose (`*.int.test.ts`)
 */
export default defineConfig({
  test: {
    projects: [
      {
        ...shared,
        test: {
          name: "unit",
          include: ["packages/*/src/**/*.test.ts"],
          exclude: ["**/*.int.test.ts", "**/node_modules/**"],
          environment: "node",
        },
      },
      {
        ...shared,
        test: {
          name: "integration",
          include: ["packages/*/src/**/*.int.test.ts"],
          environment: "node",
          testTimeout: 30_000,
          hookTimeout: 60_000,
          fileParallelism: false,
        },
      },
    ],
  },
});
