import { existsSync } from "node:fs";
import { ConflictError, OWNER_PASSWORD_MIN_LENGTH } from "@commerceos/core";
import { z } from "zod";
import type { createAuth } from "../create-auth";
import type { createAuthPool } from "../create-auth-pool";
import { createOwner } from "../create-owner";

// No "server-only" import: this runs under tsx, outside Next.js.

export const ROTATE_FLAG = "--rotate-password";

const cliEnvSchema = z.object({
  DATABASE_URL: z
    .string()
    .url()
    .refine((url) => url.startsWith("postgres://") || url.startsWith("postgresql://"), {
      message: "must be a postgres:// or postgresql:// connection string",
    }),
  APP_URL: z.string().url().default("http://localhost:3000"),
  BETTER_AUTH_SECRET: z.string().min(32, "must be at least 32 characters"),
  ADMIN_EMAIL: z.string().trim().toLowerCase().email("must be an email address"),
  ADMIN_PASSWORD: z
    .string()
    .min(OWNER_PASSWORD_MIN_LENGTH, `must be at least ${OWNER_PASSWORD_MIN_LENGTH} characters`)
    .max(128, "must be at most 128 characters"),
});

export type CliLog = { info: (message: string) => void; error: (message: string) => void };

export type RunCreateOwnerDeps = {
  env: Record<string, string | undefined>;
  argv: string[];
  createAuth: typeof createAuth;
  createAuthPool: typeof createAuthPool;
  log: CliLog;
};

/** Loads the repo-root `.env` for local runs; real environment variables take precedence. */
export function loadEnvFileIfPresent(path: string): void {
  if (existsSync(path)) {
    process.loadEnvFile(path);
  }
}

/**
 * `npm run admin:create [-- --rotate-password]`. Secrets come from the environment only
 * (`ADMIN_EMAIL`, `ADMIN_PASSWORD`), never from argv, and are never printed.
 * Returns the process exit code.
 */
export async function runCreateOwner(deps: RunCreateOwnerDeps): Promise<number> {
  const unknown = deps.argv.filter((arg) => arg !== ROTATE_FLAG);
  if (unknown.length > 0) {
    deps.log.error(`Unknown argument(s): ${unknown.join(" ")}. Only ${ROTATE_FLAG} is accepted.`);
    return 2;
  }

  const parsed = cliEnvSchema.safeParse(deps.env);
  if (!parsed.success) {
    const problems = parsed.error.issues.map((i) => `  - ${i.path.join(".")}: ${i.message}`);
    deps.log.error(`Invalid configuration:\n${problems.join("\n")}\nSee .env.example.`);
    return 2;
  }
  const env = parsed.data;

  const pool = deps.createAuthPool(env.DATABASE_URL);
  try {
    const auth = deps.createAuth({
      pool,
      env: { ...env, AUTH_TRUSTED_IP_HEADER: undefined },
      log: (level, message) => {
        if (level === "error") deps.log.error(message);
      },
    });
    const result = await createOwner(
      { auth },
      {
        email: env.ADMIN_EMAIL,
        password: env.ADMIN_PASSWORD,
        rotate: deps.argv.includes(ROTATE_FLAG),
      },
    );
    deps.log.info(
      result === "created"
        ? "Owner account created. Sign in at /admin/sign-in."
        : "Owner password changed. All of the owner's sessions were signed out.",
    );
    return 0;
  } catch (error) {
    deps.log.error(
      error instanceof ConflictError
        ? error.message
        : `Could not create the owner account: ${error instanceof Error ? error.message : String(error)}`,
    );
    return 1;
  } finally {
    await pool.end();
  }
}
