import "server-only";
import { z } from "zod";

/**
 * Server environment, validated once at startup. Import `env` instead of
 * reading `process.env` directly. Never expose these values to the client.
 */
const envSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  DATABASE_URL: z
    .string()
    .url()
    .refine((url) => url.startsWith("postgres://") || url.startsWith("postgresql://"), {
      message: "must be a postgres:// or postgresql:// connection string",
    }),
  /** Public origin of the app. Better Auth trusts only this origin for sign-in and sign-out. */
  APP_URL: z.string().url().default("http://localhost:3000"),
  DATABASE_DEBUG: z
    .enum(["true", "false"])
    .default("false")
    .transform((value) => value === "true"),
  /** Signs and encrypts Better Auth cookies and tokens. Generate with `openssl rand -base64 32`. */
  BETTER_AUTH_SECRET: z.string().min(32, "must be at least 32 characters"),
  /**
   * Header that carries the client IP, set only behind a proxy that overwrites it
   * (e.g. `x-real-ip`). Unset: sign-in is rate-limited globally, never by a forgeable header.
   */
  AUTH_TRUSTED_IP_HEADER: z
    .string()
    .regex(/^[a-z0-9-]+$/, "must be a lowercase header name")
    .optional(),
});

export type Env = z.infer<typeof envSchema>;

export function parseEnv(source: Record<string, string | undefined>): Env {
  const result = envSchema.safeParse(source);
  const problems = result.success
    ? []
    : result.error.issues.map((issue) => `  - ${issue.path.join(".")}: ${issue.message}`);
  // APP_URL is the trusted origin: a silent localhost default must never reach production.
  if (source.NODE_ENV === "production" && !source.APP_URL) {
    problems.push("  - APP_URL: is required in production");
  }
  if (!result.success || problems.length > 0) {
    throw new Error(
      `Invalid environment configuration:\n${problems.join("\n")}\nSee .env.example in the repository root.`,
    );
  }
  return result.data;
}

let cached: Env | undefined;

/** Lazily validated so `next build` does not require runtime secrets. */
export function getEnv(): Env {
  cached ??= parseEnv(process.env);
  return cached;
}
