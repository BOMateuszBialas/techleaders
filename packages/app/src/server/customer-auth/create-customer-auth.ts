import { betterAuth, type BetterAuthOptions } from "better-auth";
import { nextCookies } from "better-auth/next-js";
import {
  SESSION_EXPIRES_IN_SECONDS,
  SESSION_UPDATE_AGE_SECONDS,
  SIGN_IN_LIMIT,
  snakeCase,
  summarizeAuthError,
  type AuthDeps,
  type AuthEnv,
  type AuthLogLevel,
} from "../auth/create-auth";

// SPIKE (E07 Phase 0, throwaway branch): the customer instance as spec A1/A6/A8/A10 describe it.

export const CUSTOMER_BASE_PATH = "/api/customer-auth";
export const CUSTOMER_COOKIE_PREFIX = "commerceos-customer";
export const CUSTOMER_NAME = "Customer";

/** The four library paths the customer area uses (spec A1, API Contracts). */
export const CUSTOMER_ENABLED_PATHS = [
  "/sign-up/email",
  "/sign-in/email",
  "/sign-out",
  "/get-session",
] as const;

/**
 * Every other fixed path of better-auth 1.7.10's router (listed from `auth.api` in the spike).
 * `/callback/:id` and `/reset-password/:token` have parameters: `disabledPaths` matches exact
 * strings only, so they cannot be listed here (spike h).
 */
export const CUSTOMER_DISABLED_PATHS = [
  "/sign-in/social",
  "/reset-password",
  "/verify-password",
  "/verify-email",
  "/send-verification-email",
  "/change-email",
  "/change-password",
  "/update-session",
  "/update-user",
  "/delete-user",
  "/request-password-reset",
  "/list-sessions",
  "/revoke-session",
  "/revoke-sessions",
  "/revoke-other-sessions",
  "/link-social",
  "/list-accounts",
  "/delete-user/callback",
  "/unlink-account",
  "/refresh-token",
  "/get-access-token",
  "/account-info",
  "/ok",
  "/error",
];

export type CustomerAuthEnv = AuthEnv & { CUSTOMER_AUTH_SECRET?: string | undefined };
export type CustomerAuthDeps = Omit<AuthDeps, "env"> & { env: CustomerAuthEnv };

export function createCustomerAuthOptions({ pool, env, log }: CustomerAuthDeps) {
  const trustedIpHeader = env.AUTH_TRUSTED_IP_HEADER;
  const limit = {
    window: SIGN_IN_LIMIT.window,
    max: trustedIpHeader ? SIGN_IN_LIMIT.perIp : SIGN_IN_LIMIT.shared,
  };
  return {
    database: pool,
    baseURL: env.APP_URL,
    basePath: CUSTOMER_BASE_PATH,
    trustedOrigins: [env.APP_URL],
    secret: env.CUSTOMER_AUTH_SECRET ?? env.BETTER_AUTH_SECRET,
    disabledPaths: CUSTOMER_DISABLED_PATHS,
    emailAndPassword: {
      enabled: true,
      disableSignUp: false,
      minPasswordLength: 8,
      maxPasswordLength: 128,
      autoSignIn: true,
    },
    session: {
      expiresIn: SESSION_EXPIRES_IN_SECONDS,
      updateAge: SESSION_UPDATE_AGE_SECONDS,
      cookieCache: { enabled: false },
      modelName: "customer_sessions",
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
      modelName: "customer_users",
      fields: snakeCase(["name", "email", "emailVerified", "image", "createdAt", "updatedAt"]),
      additionalFields: {
        role: { type: "string", input: false, defaultValue: "customer", required: true },
      },
    },
    account: {
      modelName: "customer_accounts",
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
      modelName: "customer_verifications",
      fields: snakeCase(["identifier", "value", "expiresAt", "createdAt", "updatedAt"]),
    },
    rateLimit: {
      enabled: true,
      storage: "database",
      modelName: "customer_rate_limits",
      fields: snakeCase(["key", "count", "lastRequest"]),
      customRules: { "/sign-in/email": limit, "/sign-up/email": limit },
    },
    advanced: {
      disableOriginCheck: false,
      cookiePrefix: CUSTOMER_COOKIE_PREFIX,
      database: { generateId: "uuid" },
      ipAddress: { ipAddressHeaders: trustedIpHeader ? [trustedIpHeader] : [] },
    },
    logger: {
      level: "warn",
      log: (level: AuthLogLevel, message: string, ...args: unknown[]) =>
        log(
          level,
          `[better-auth:customer] ${message}`,
          args.map((arg) => summarizeAuthError(arg)).find(Boolean),
        ),
    },
    // A7: the raw endpoint accepts name and image from the body; the server fixes both.
    databaseHooks: {
      user: {
        create: {
          before: async (user: Record<string, unknown>) => ({
            data: { ...user, name: CUSTOMER_NAME, image: null },
          }),
        },
      },
    },
    plugins: [nextCookies()],
  } satisfies BetterAuthOptions;
}

export function createCustomerAuth(deps: CustomerAuthDeps) {
  return betterAuth(createCustomerAuthOptions(deps));
}

export type CustomerAuth = ReturnType<typeof createCustomerAuth>;
