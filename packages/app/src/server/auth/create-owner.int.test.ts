import { execFile } from "node:child_process";
import { fileURLToPath } from "node:url";
import { promisify } from "node:util";
import { afterAll, beforeAll, describe, expect, inject, it } from "vitest";
import { createAuth } from "./create-auth";
import { createAuthPool } from "./create-auth-pool";

// Mirrors the augmentation in `@commerceos/database/testing`, which app code must not import.
declare module "vitest" {
  export interface ProvidedContext {
    databaseUrl: string;
  }
}

const run = promisify(execFile);
const repoRoot = fileURLToPath(new URL("../../../../../", import.meta.url));
const tsxCli = `${repoRoot}node_modules/tsx/dist/cli.mjs`;

const APP_URL = "http://localhost:3000";
const SECRET = "c".repeat(32);
const EMAIL = "owner@cli-int.test";
const databaseUrl = inject("databaseUrl");
const pool = createAuthPool(databaseUrl);

/** Runs `admin:create` as a real subprocess and returns its exit code and output. */
async function adminCreate(password: string, ...args: string[]) {
  try {
    const { stdout, stderr } = await run(
      process.execPath,
      [tsxCli, "packages/app/src/server/auth/cli/create-owner.ts", ...args],
      {
        cwd: repoRoot,
        env: {
          ...process.env,
          DATABASE_URL: databaseUrl,
          BETTER_AUTH_SECRET: SECRET,
          APP_URL,
          ADMIN_EMAIL: EMAIL,
          ADMIN_PASSWORD: password,
        },
      },
    );
    return { code: 0, output: stdout + stderr };
  } catch (error) {
    const failed = error as { code: number; stdout: string; stderr: string };
    return { code: failed.code, output: failed.stdout + failed.stderr };
  }
}

function signIn(password: string) {
  const auth = createAuth({
    pool,
    env: { APP_URL, BETTER_AUTH_SECRET: SECRET, AUTH_TRUSTED_IP_HEADER: undefined },
    log: () => {},
  });
  return auth.handler(
    new Request(`${APP_URL}/api/auth/sign-in/email`, {
      method: "POST",
      headers: { "content-type": "application/json", origin: APP_URL },
      body: JSON.stringify({ email: EMAIL, password }),
    }),
  );
}

describe("admin:create CLI (subprocess, PostgreSQL)", () => {
  beforeAll(async () => {
    await run(process.execPath, [tsxCli, "packages/database/src/cli/migrate.ts", "up"], {
      cwd: repoRoot,
      env: { ...process.env, DATABASE_URL: databaseUrl },
    });
    // Exactly one owner may exist, so start from an empty admin table.
    await pool.query("delete from admin_users");
    await pool.query("delete from admin_rate_limits");
  });

  afterAll(async () => {
    await pool.end();
  });

  it("refuses a password under 12 characters without writing anything", async () => {
    const result = await adminCreate("eleven-char");
    expect(result.code).toBe(2);
    expect(result.output).toMatch(/ADMIN_PASSWORD: must be at least 12/);
    expect((await pool.query("select 1 from admin_users")).rowCount).toBe(0);
  });

  it("creates the owner, who can then sign in", async () => {
    const result = await adminCreate("first-password-123");
    expect(result).toMatchObject({ code: 0 });
    expect(result.output).toContain("Owner account created");
    expect(result.output).not.toContain("first-password-123");
    expect((await signIn("first-password-123")).status).toBe(200);
  });

  it("refuses to overwrite the owner without --rotate-password", async () => {
    const result = await adminCreate("other-password-456");
    expect(result.code).toBe(1);
    expect(result.output).toMatch(/--rotate-password/);
    expect((await signIn("first-password-123")).status).toBe(200);
  });

  it("rotates the password and revokes every session", async () => {
    expect(
      Number((await pool.query("select count(*) from admin_sessions")).rows[0]?.count),
    ).toBeGreaterThan(0);
    const result = await adminCreate("rotated-password-789", "--rotate-password");
    expect(result).toMatchObject({ code: 0 });
    expect(Number((await pool.query("select count(*) from admin_sessions")).rows[0]?.count)).toBe(
      0,
    );
    expect((await signIn("first-password-123")).status).toBe(401);
    expect((await signIn("rotated-password-789")).status).toBe(200);
  });
});
