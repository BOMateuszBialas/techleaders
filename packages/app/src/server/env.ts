import "server-only";
import { z } from "zod";

/**
 * Server environment, validated once at startup. Import `env` instead of
 * reading `process.env` directly. Never expose these values to the client.
 */
const EnvSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  DATABASE_URL: z
    .string()
    .url()
    .refine((url) => url.startsWith("postgres://") || url.startsWith("postgresql://"), {
      message: "must be a postgres:// or postgresql:// connection string",
    }),
  APP_URL: z.string().url().default("http://localhost:3000"),
  DATABASE_DEBUG: z
    .enum(["true", "false"])
    .default("false")
    .transform((value) => value === "true"),
});

export type Env = z.infer<typeof EnvSchema>;

export function parseEnv(source: Record<string, string | undefined>): Env {
  const result = EnvSchema.safeParse(source);
  if (!result.success) {
    const problems = result.error.issues
      .map((issue) => `  - ${issue.path.join(".")}: ${issue.message}`)
      .join("\n");
    throw new Error(
      `Invalid environment configuration:\n${problems}\nSee .env.example in the repository root.`,
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
