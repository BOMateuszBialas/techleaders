import { betterAuth, type BetterAuthOptions } from "better-auth";
import { nextCookies } from "better-auth/next-js";
import type { Env } from "../env";
import {
  authLogger,
  authModels,
  authPathLimit,
  SESSION_EXPIRES_IN_SECONDS,
  SESSION_UPDATE_AGE_SECONDS,
  type AuthDeps,
} from "../auth/create-auth";

// No "server-only" import, like `create-auth.ts`: integration tests build it outside Next.js.

/** Where the customer instance's HTTP endpoints live (E07 spec A1). */
export const CUSTOMER_AUTH_BASE_PATH = "/api/customer-auth";
/** Cookie prefix: the session cookie is `commerceos-customer.session_token` (spec A1). */
export const CUSTOMER_COOKIE_PREFIX = "commerceos-customer";
/** The fixed `name` of every customer account: the form asks for none (spec A7). */
export const CUSTOMER_NAME = "Customer";
export const CUSTOMER_PASSWORD_MAX_LENGTH = 128;
export const CUSTOMER_SIGN_IN_PATH = "/sign-in/email";
export const CUSTOMER_SIGN_UP_PATH = "/sign-up/email";

/**
 * The only method-and-path pairs the customer area uses (spec A1, API Contracts). The route
 * handler answers 404 to anything else before the instance is resolved (spike h).
 */
export const CUSTOMER_ENABLED_ENDPOINTS = [
  { method: "POST", path: CUSTOMER_SIGN_UP_PATH },
  { method: "POST", path: CUSTOMER_SIGN_IN_PATH },
  { method: "POST", path: "/sign-out" },
  { method: "GET", path: "/get-session" },
] as const;

/**
 * Every other fixed path of better-auth 1.7.10's router, switched off with `disabledPaths`: the
 * second layer behind the route allowlist, for in-process handler calls. Nothing can change a
 * customer's name, image, email or role after sign-up. `/callback/:id` and
 * `/reset-password/:token` have parameters, which `disabledPaths` cannot match (exact strings,
 * spike h): only the route allowlist stops them. A unit test lists the built instance's
 * endpoints, so a library upgrade that adds a path fails until it is listed here.
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

export type CustomerAuthEnv = Pick<
  Env,
  "APP_URL" | "BETTER_AUTH_SECRET" | "CUSTOMER_AUTH_SECRET" | "AUTH_TRUSTED_IP_HEADER"
>;
export type CustomerAuthDeps = Omit<AuthDeps, "env"> & { env: CustomerAuthEnv };

/**
 * The customer Better Auth instance's configuration (E07 spec A1, A6–A8, A10, "Spike results").
 * A separate instance from the owner's: its own tables, base path, cookie prefix and secret,
 * sharing only the connection pool. Kept separate from `createCustomerAuth` so it can be
 * asserted without a database.
 */
export function createCustomerAuthOptions({ pool, env, log }: CustomerAuthDeps) {
  const trustedIpHeader = env.AUTH_TRUSTED_IP_HEADER;
  const models = authModels("customer");
  const limit = authPathLimit(trustedIpHeader);
  return {
    database: pool,
    baseURL: env.APP_URL,
    basePath: CUSTOMER_AUTH_BASE_PATH,
    trustedOrigins: [env.APP_URL],
    // parseEnv requires a distinct secret in production; the fallback serves dev and test (A6).
    secret: env.CUSTOMER_AUTH_SECRET ?? env.BETTER_AUTH_SECRET,
    disabledPaths: CUSTOMER_DISABLED_PATHS,
    emailAndPassword: {
      enabled: true,
      disableSignUp: false,
      minPasswordLength: 8,
      maxPasswordLength: CUSTOMER_PASSWORD_MAX_LENGTH,
      autoSignIn: true,
    },
    session: {
      expiresIn: SESSION_EXPIRES_IN_SECONDS,
      updateAge: SESSION_UPDATE_AGE_SECONDS,
      // Off, so a deleted session row is rejected on the very next request (A8).
      cookieCache: { enabled: false },
      ...models.session,
    },
    user: {
      ...models.user,
      additionalFields: {
        // Never settable from a request: a body's `role` is ignored (spike b). The table's
        // check constraint rejects any other value.
        role: { type: "string", input: false, defaultValue: "customer", required: true },
      },
    },
    account: models.account,
    verification: models.verification,
    rateLimit: {
      enabled: true,
      storage: "database",
      ...models.rateLimit,
      // Separate keys per path, separate table from the owner's (A10, spike e).
      customRules: { [CUSTOMER_SIGN_IN_PATH]: limit, [CUSTOMER_SIGN_UP_PATH]: limit },
    },
    advanced: {
      // Explicit: Better Auth silently skips the origin (CSRF) check when NODE_ENV=test.
      disableOriginCheck: false,
      cookiePrefix: CUSTOMER_COOKIE_PREFIX,
      database: { generateId: "uuid" },
      // Never the library default (x-forwarded-for): without a proxy a client can forge it.
      ipAddress: { ipAddressHeaders: trustedIpHeader ? [trustedIpHeader] : [] },
    },
    logger: authLogger(log, "better-auth:customer"),
    databaseHooks: {
      user: {
        create: {
          // The raw endpoint stores any `name` and `image` from the body (spike b): the server
          // fixes both on every path (A7).
          before: async (user: Record<string, unknown>) => ({
            data: { ...user, name: CUSTOMER_NAME, image: null },
          }),
        },
      },
    },
    // Must stay last: lets server actions set and expire the session cookie.
    plugins: [nextCookies()],
  } satisfies BetterAuthOptions;
}

export function createCustomerAuth(deps: CustomerAuthDeps) {
  return betterAuth(createCustomerAuthOptions(deps));
}

export type CustomerAuth = ReturnType<typeof createCustomerAuth>;
