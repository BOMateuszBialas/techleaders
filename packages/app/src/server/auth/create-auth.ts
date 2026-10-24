import { betterAuth, type BetterAuthOptions } from "better-auth";
import { nextCookies } from "better-auth/next-js";
import type { Pool } from "pg";
import type { Env } from "../env";

// No "server-only" import: the owner CLI reuses this factory outside Next.js.

export type AuthEnv = Pick<Env, "APP_URL" | "BETTER_AUTH_SECRET" | "AUTH_TRUSTED_IP_HEADER">;
export type AuthLogLevel = "debug" | "info" | "warn" | "error";
/**
 * What a log line may say about the error behind a Better Auth log call (#57): its class,
 * codes and cause chain. Never request data (the library's other arguments) and never a
 * driver error's message, which can inline query parameters (see `sanitizeDatabaseError` in
 * `packages/database/src/adapters/sanitize-database-error.ts`).
 */
export type AuthErrorSummary = {
  name: string;
  code?: string;
  constraint?: string;
  message?: string;
  cause?: AuthErrorSummary;
};
export type AuthLog = (level: AuthLogLevel, message: string, error?: AuthErrorSummary) => void;
export type AuthDeps = { pool: Pool; env: AuthEnv; log: AuthLog };

/** 8 h of inactivity ends a session; activity extends it (spec Q5, G3). */
export const SESSION_EXPIRES_IN_SECONDS = 8 * 60 * 60;
export const SESSION_UPDATE_AGE_SECONDS = 60 * 60;
export const SIGN_IN_PATH = "/sign-in/email";
/** Per trusted client IP, or one shared bucket when no trusted IP header is configured (spec G2). */
export const SIGN_IN_LIMIT = { window: 60, perIp: 5, shared: 20 } as const;
export const OWNER_NAME = "Store owner";

const MAX_CAUSE_DEPTH = 3;
const MAX_MESSAGE_LENGTH = 200;

function stringField(error: Error, key: "code" | "constraint"): string | undefined {
  const value: unknown = Reflect.get(error, key);
  return typeof value === "string" ? value : undefined;
}

/**
 * Error classes whose message is a fixed library or runtime text. Anything else (a
 * `SyntaxError` quoting its input, a driver error) keeps only its class and codes.
 */
const MESSAGE_SAFE_ERRORS = new Set(["Error", "BetterAuthError", "APIError"]);

/**
 * pg's DatabaseError and Node's network errors carry a code; ORM exceptions end in
 * "Exception". Their messages may hold query values or hosts.
 */
function isDriverError(error: Error): boolean {
  return stringField(error, "code") !== undefined || error.name.endsWith("Exception");
}

/** True when the error or any cause within the logged depth comes from a driver. */
function hasDriverCause(value: unknown, depth = 0): boolean {
  if (!(value instanceof Error) || depth > MAX_CAUSE_DEPTH) return false;
  return isDriverError(value) || hasDriverCause(value.cause, depth + 1);
}

function summarize(error: Error, depth: number, keepMessages: boolean): AuthErrorSummary {
  const code = stringField(error, "code");
  const constraint = stringField(error, "constraint");
  const cause =
    depth < MAX_CAUSE_DEPTH && error.cause instanceof Error
      ? summarize(error.cause, depth + 1, keepMessages)
      : undefined;
  const keepMessage = keepMessages && MESSAGE_SAFE_ERRORS.has(error.name);
  return {
    name: error.name,
    ...(code !== undefined && { code }),
    ...(constraint !== undefined && { constraint }),
    ...(keepMessage && { message: error.message.slice(0, MAX_MESSAGE_LENGTH) }),
    ...(cause && { cause }),
  };
}

/**
 * Summarises an error for the log, or `undefined` when the value is not an `Error`. When any
 * error in the chain comes from a driver, no message is kept at any level: a wrapper's
 * message may repeat the driver's.
 */
export function summarizeAuthError(value: unknown): AuthErrorSummary | undefined {
  if (!(value instanceof Error)) return undefined;
  return summarize(value, 0, !hasDriverCause(value));
}

/** Maps Better Auth table and column names to the project's snake_case schema. */
export function snakeCase(fields: readonly string[]): Record<string, string> {
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
      // The message plus a summary of the first error argument: the other arguments may
      // carry request data. Without the error, "Failed to get session" cannot be diagnosed.
      log: (level: AuthLogLevel, message: string, ...args: unknown[]) =>
        log(
          level,
          `[better-auth] ${message}`,
          args.map((arg) => summarizeAuthError(arg)).find(Boolean),
        ),
    },
    // Must stay last: lets server actions set the session cookie.
    plugins: [nextCookies()],
  } satisfies BetterAuthOptions;
}

export function createAuth(deps: AuthDeps) {
  return betterAuth(createAuthOptions(deps));
}

export type Auth = ReturnType<typeof createAuth>;
