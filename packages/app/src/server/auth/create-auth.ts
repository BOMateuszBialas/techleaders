import { betterAuth, type BetterAuthOptions } from "better-auth";
import { nextCookies } from "better-auth/next-js";
import type { Pool } from "pg";
import type { Env } from "../env";

// No "server-only" import: the owner CLI reuses this factory outside Next.js.

export type AuthEnv = Pick<Env, "APP_URL" | "BETTER_AUTH_SECRET" | "AUTH_TRUSTED_IP_HEADER">;
export type AuthLogLevel = "debug" | "info" | "warn" | "error";
export type AuthLog = (level: AuthLogLevel, message: string) => void;
export type AuthDeps = { pool: Pool; env: AuthEnv; log: AuthLog };

/** 8 h of inactivity ends a session; activity extends it (spec Q5, G3). */
export const SESSION_EXPIRES_IN_SECONDS = 8 * 60 * 60;
export const SESSION_UPDATE_AGE_SECONDS = 60 * 60;
export const SIGN_IN_PATH = "/sign-in/email";
/** Per trusted client IP, or one shared bucket when no trusted IP header is configured (spec G2). */
export const SIGN_IN_LIMIT = { window: 60, perIp: 5, shared: 20 } as const;
export const OWNER_NAME = "Store owner";

/** Maps Better Auth table and column names to the project's snake_case schema. */
function snakeCase(fields: readonly string[]): Record<string, string> {
  return Object.fromEntries(
    fields.map((field) => [field, field.replace(/[A-Z]/g, (c) => `_${c.toLowerCase()}`)]),
  );
}

/**
 * Better Auth configuration (spec "Better Auth configuration" and "Spike results").
 * Kept separate from `createAuth` so it can be asserted without a database.
 */
export function createAuthOptions({ pool, env, log }: AuthDeps) {
  const trustedIpHeader = env.AUTH_TRUSTED_IP_HEADER;
  return {
    database: pool,
    baseURL: env.APP_URL,
    trustedOrigins: [env.APP_URL],
    secret: env.BETTER_AUTH_SECRET,
    emailAndPassword: { enabled: true, disableSignUp: true, minPasswordLength: 8 },
    session: {
      expiresIn: SESSION_EXPIRES_IN_SECONDS,
      updateAge: SESSION_UPDATE_AGE_SECONDS,
      // Off, so a deleted session is rejected on the very next request (AC4).
      cookieCache: { enabled: false },
      modelName: "admin_sessions",
      fields: snakeCase([
        "expiresAt",
        "token",
        "createdAt",
        "updatedAt",
        "ipAddress",
        "userAgent",
        "userId",
      ]),
    },
    user: {
      modelName: "admin_users",
      fields: snakeCase(["name", "email", "emailVerified", "image", "createdAt", "updatedAt"]),
      additionalFields: {
        // Never settable from a request (Q4).
        role: { type: "string", input: false, defaultValue: "owner", required: true },
      },
    },
    account: {
      modelName: "admin_accounts",
      fields: snakeCase([
        "accountId",
        "providerId",
        "userId",
        "accessToken",
        "refreshToken",
        "idToken",
        "accessTokenExpiresAt",
        "refreshTokenExpiresAt",
        "scope",
        "password",
        "createdAt",
        "updatedAt",
      ]),
    },
    verification: {
      modelName: "admin_verifications",
      fields: snakeCase(["identifier", "value", "expiresAt", "createdAt", "updatedAt"]),
    },
    rateLimit: {
      enabled: true,
      storage: "database",
      modelName: "admin_rate_limits",
      fields: snakeCase(["key", "count", "lastRequest"]),
      customRules: {
        [SIGN_IN_PATH]: {
          window: SIGN_IN_LIMIT.window,
          max: trustedIpHeader ? SIGN_IN_LIMIT.perIp : SIGN_IN_LIMIT.shared,
        },
      },
    },
    advanced: {
      // Explicit: Better Auth silently skips the origin (CSRF) check when NODE_ENV=test.
      disableOriginCheck: false,
      database: { generateId: "uuid" },
      // Never the library default (x-forwarded-for): without a proxy a client can forge it.
      ipAddress: { ipAddressHeaders: trustedIpHeader ? [trustedIpHeader] : [] },
    },
    logger: {
      level: "warn",
      // Only the message: extra arguments may carry request data.
      log: (level: AuthLogLevel, message: string) => log(level, `[better-auth] ${message}`),
    },
    // Must stay last: lets server actions set the session cookie.
    plugins: [nextCookies()],
  } satisfies BetterAuthOptions;
}

export function createAuth(deps: AuthDeps) {
  return betterAuth(createAuthOptions(deps));
}

export type Auth = ReturnType<typeof createAuth>;
