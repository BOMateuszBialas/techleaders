import { execFile, spawn, type ChildProcess } from "node:child_process";
import { randomBytes } from "node:crypto";
import { existsSync } from "node:fs";
import { createServer } from "node:net";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { promisify } from "node:util";
import { seedE2eCatalog, startPostgresContainer } from "@commerceos/database/testing";
import type { TestProject } from "vitest/node";
import "@commerceos/database/testing";
import { assertAgentBrowserInstalled, resolveAgentBrowserBin } from "./agent-browser";
import "./provided-context";
import { signInOverHttp, signUpCustomerOverHttp } from "./sign-in";

/** The owner every admin e2e test signs in as (spec G9); the password is new on every run. */
export const E2E_OWNER_EMAIL = "owner@e2e.test";
/** Customers A and B of the role-separation and isolation tests (E07 step 8), new every run. */
export const E2E_CUSTOMER_A_EMAIL = "customer-a@e2e.test";
export const E2E_CUSTOMER_B_EMAIL = "customer-b@e2e.test";

const run = promisify(execFile);

const repoRoot = fileURLToPath(new URL("../../../../", import.meta.url));
const appDir = fileURLToPath(new URL("../../", import.meta.url));
const nextBin = join(repoRoot, "node_modules", "next", "dist", "bin", "next");
const tsxCli = join(repoRoot, "node_modules", "tsx", "dist", "cli.mjs");

const STARTUP_TIMEOUT_MS = 60_000;
const POLL_INTERVAL_MS = 250;

/**
 * Vitest global setup for `*.e2e.test.ts`. Instantiates the whole app
 * ephemerally: PostgreSQL container → real migrate, seed and `admin:create` CLI (plus the
 * `[E2E]` catalog fixtures) →
 * production `next start` on a free port → wait until `/api/health` is ok. The base
 * URL and the owner's credentials reach the tests through `inject()`.
 */
export default async function setup(project: TestProject): Promise<() => Promise<void>> {
  if (!existsSync(new URL("../../.next/BUILD_ID", import.meta.url))) {
    throw new Error("No production build found. Run `npm run build` before `npm run test:e2e`.");
  }
  await assertAgentBrowserInstalled(resolveAgentBrowserBin());

  const postgres = await startPostgresContainer();
  let server: ChildProcess | undefined;
  try {
    await runDatabaseCli(postgres.url, "packages/database/src/cli/migrate.ts", {}, "up");
    await runDatabaseCli(postgres.url, "packages/database/src/cli/seed.ts");
    // [E2E] drafts and empty categories on top of the demo catalog (storefront spec, Q9).
    await seedE2eCatalog(postgres.url);
    // Fresh per run: nothing secret is committed.
    const authSecret = randomBytes(32).toString("base64");
    // The customer instance signs with its own secret; production requires it (E07 A6).
    const customerAuthSecret = randomBytes(32).toString("base64");
    const ownerPassword = randomBytes(18).toString("base64url");
    await runDatabaseCli(postgres.url, "packages/app/src/server/auth/cli/create-owner.ts", {
      BETTER_AUTH_SECRET: authSecret,
      ADMIN_EMAIL: E2E_OWNER_EMAIL,
      ADMIN_PASSWORD: ownerPassword,
    });

    const port = await findFreePort();
    const baseUrl = `http://127.0.0.1:${port}`;
    server = startApp({ port, databaseUrl: postgres.url, authSecret, customerAuthSecret });
    await waitUntilHealthy(baseUrl, server);

    project.provide("databaseUrl", postgres.url);
    project.provide("baseUrl", baseUrl);
    project.provide("ownerEmail", E2E_OWNER_EMAIL);
    project.provide("ownerPassword", ownerPassword);
    project.provide(
      "ownerSessionCookie",
      await signInOverHttp(baseUrl, E2E_OWNER_EMAIL, ownerPassword),
    );
    // Created once over HTTP with random passwords (admin-auth G9), so suites spend no sign-up
    // from the customer instance's shared limit of 20 per minute (E07 spec, Risks).
    for (const [key, email] of [
      ["A", E2E_CUSTOMER_A_EMAIL],
      ["B", E2E_CUSTOMER_B_EMAIL],
    ] as const) {
      const password = randomBytes(18).toString("base64url");
      project.provide(`customer${key}Email`, email);
      project.provide(`customer${key}Password`, password);
      project.provide(
        `customer${key}SessionCookie`,
        await signUpCustomerOverHttp(baseUrl, email, password),
      );
    }
  } catch (error) {
    server?.kill();
    await postgres.stop();
    throw error;
  }

  return async () => {
    server?.kill();
    await postgres.stop();
  };
}

async function runDatabaseCli(
  databaseUrl: string,
  script: string,
  extraEnv: Record<string, string> = {},
  ...args: string[]
) {
  await run(process.execPath, [tsxCli, script, ...args], {
    cwd: repoRoot,
    env: { ...process.env, ...extraEnv, DATABASE_URL: databaseUrl },
  });
}

function startApp(options: {
  port: number;
  databaseUrl: string;
  authSecret: string;
  customerAuthSecret: string;
}): ChildProcess {
  const server = spawn(process.execPath, [nextBin, "start", appDir, "-p", String(options.port)], {
    cwd: repoRoot,
    // Real environment variables take precedence over the root .env (see next.config.ts).
    env: {
      ...process.env,
      NODE_ENV: "production",
      DATABASE_URL: options.databaseUrl,
      APP_URL: `http://127.0.0.1:${options.port}`,
      BETTER_AUTH_SECRET: options.authSecret,
      CUSTOMER_AUTH_SECRET: options.customerAuthSecret,
      // Never call a real LLM from e2e: blank values beat the developer's shell and root .env
      // (an empty string counts as unset), so the Copilot answers with rule-based insights.
      LLM_PROVIDER: "",
      LLM_API_KEY: "",
      LLM_MODEL: "",
    },
    stdio: ["ignore", "pipe", "pipe"],
  });
  const output: string[] = [];
  server.stdout?.on("data", (chunk: Buffer) => output.push(chunk.toString()));
  server.stderr?.on("data", (chunk: Buffer) => output.push(chunk.toString()));
  server.once("exit", (code) => {
    if (code !== null && code !== 0) {
      console.error(`[e2e] next start exited with code ${code}:\n${output.join("")}`);
    }
  });
  return server;
}

async function waitUntilHealthy(baseUrl: string, server: ChildProcess): Promise<void> {
  const deadline = Date.now() + STARTUP_TIMEOUT_MS;
  while (Date.now() < deadline) {
    if (server.exitCode !== null) throw new Error("The app exited during startup (see log).");
    const response = await fetch(`${baseUrl}/api/health`).catch(() => null);
    if (response?.ok) return;
    await new Promise((done) => setTimeout(done, POLL_INTERVAL_MS));
  }
  throw new Error(`The app did not become healthy within ${STARTUP_TIMEOUT_MS} ms.`);
}

function findFreePort(): Promise<number> {
  return new Promise((done, fail) => {
    const probe = createServer();
    probe.once("error", fail);
    probe.listen(0, "127.0.0.1", () => {
      const address = probe.address();
      probe.close(() =>
        typeof address === "object" && address ? done(address.port) : fail(new Error("No port")),
      );
    });
  });
}
