import { execFile, spawn, type ChildProcess } from "node:child_process";
import { existsSync } from "node:fs";
import { createServer } from "node:net";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { promisify } from "node:util";
import { startPostgresContainer } from "@commerceos/database/testing";
import type { TestProject } from "vitest/node";
import "@commerceos/database/testing";
import { assertAgentBrowserInstalled, resolveAgentBrowserBin } from "./agent-browser";

const run = promisify(execFile);

const repoRoot = fileURLToPath(new URL("../../../../", import.meta.url));
const appDir = fileURLToPath(new URL("../../", import.meta.url));
const nextBin = join(repoRoot, "node_modules", "next", "dist", "bin", "next");
const tsxCli = join(repoRoot, "node_modules", "tsx", "dist", "cli.mjs");

const STARTUP_TIMEOUT_MS = 60_000;
const POLL_INTERVAL_MS = 250;

/**
 * Vitest global setup for `*.e2e.test.ts`. Instantiates the whole app
 * ephemerally: PostgreSQL container → real migrate and seed CLI → production
 * `next start` on a free port → wait until `/api/health` is ok. The base URL
 * is handed to the tests through `inject("baseUrl")`.
 */
export default async function setup(project: TestProject): Promise<() => Promise<void>> {
  if (!existsSync(new URL("../../.next/BUILD_ID", import.meta.url))) {
    throw new Error("No production build found. Run `npm run build` before `npm run test:e2e`.");
  }
  await assertAgentBrowserInstalled(resolveAgentBrowserBin());

  const postgres = await startPostgresContainer();
  let server: ChildProcess | undefined;
  try {
    await runDatabaseCli(postgres.url, "packages/database/src/cli/migrate.ts", "up");
    await runDatabaseCli(postgres.url, "packages/database/src/cli/seed.ts");

    const port = await findFreePort();
    const baseUrl = `http://127.0.0.1:${port}`;
    server = startApp({ port, databaseUrl: postgres.url });
    await waitUntilHealthy(baseUrl, server);

    project.provide("databaseUrl", postgres.url);
    project.provide("baseUrl", baseUrl);
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

async function runDatabaseCli(databaseUrl: string, script: string, ...args: string[]) {
  await run(process.execPath, [tsxCli, script, ...args], {
    cwd: repoRoot,
    env: { ...process.env, DATABASE_URL: databaseUrl },
  });
}

function startApp(options: { port: number; databaseUrl: string }): ChildProcess {
  const server = spawn(process.execPath, [nextBin, "start", appDir, "-p", String(options.port)], {
    cwd: repoRoot,
    // Real environment variables take precedence over the root .env (see next.config.ts).
    env: {
      ...process.env,
      NODE_ENV: "production",
      DATABASE_URL: options.databaseUrl,
      APP_URL: `http://127.0.0.1:${options.port}`,
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
