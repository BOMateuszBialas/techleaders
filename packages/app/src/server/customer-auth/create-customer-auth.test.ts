import { afterAll, describe, expect, it, vi } from "vitest";
import { createAuthOptions, SIGN_IN_LIMIT } from "../auth/create-auth";
import { createAuthPool } from "../auth/create-auth-pool";
import {
  CUSTOMER_AUTH_BASE_PATH,
  CUSTOMER_COOKIE_PREFIX,
  CUSTOMER_DISABLED_PATHS,
  CUSTOMER_ENABLED_ENDPOINTS,
  CUSTOMER_NAME,
  createCustomerAuth,
  createCustomerAuthOptions,
  type CustomerAuthDeps,
} from "./create-customer-auth";

// Nothing listens on port 1, and nothing in these tests opens a connection.
const pool = createAuthPool("postgresql://nobody@127.0.0.1:1/none");
afterAll(() => pool.end());
const OWNER_SECRET = "o".repeat(32);
const CUSTOMER_SECRET = "c".repeat(32);
const testEnv = {
  APP_URL: "https://shop.example",
  BETTER_AUTH_SECRET: OWNER_SECRET,
  CUSTOMER_AUTH_SECRET: CUSTOMER_SECRET,
  AUTH_TRUSTED_IP_HEADER: undefined,
};
const deps = (overrides: Partial<CustomerAuthDeps> = {}): CustomerAuthDeps => ({
  pool,
  env: testEnv,
  log: vi.fn(),
  ...overrides,
});

describe("createCustomerAuthOptions (E07 spec A1, A6–A8, A10)", () => {
  it("lives under its own base path and cookie prefix, trusting only the app origin", () => {
    const options = createCustomerAuthOptions(deps());
    expect(options.basePath).toBe("/api/customer-auth");
    expect(CUSTOMER_AUTH_BASE_PATH).toBe(options.basePath);
    expect(options.advanced.cookiePrefix).toBe("commerceos-customer");
    expect(CUSTOMER_COOKIE_PREFIX).toBe(options.advanced.cookiePrefix);
    expect(options.baseURL).toBe(testEnv.APP_URL);
    expect(options.trustedOrigins).toEqual([testEnv.APP_URL]);
    expect(options.database).toBe(pool);
    expect(options.advanced.disableOriginCheck).toBe(false);
    expect(options.advanced.database.generateId).toBe("uuid");
  });

  it("signs with its own secret, falling back to the owner secret only when unset (A6)", () => {
    expect(createCustomerAuthOptions(deps()).secret).toBe(CUSTOMER_SECRET);
    const fallback = createCustomerAuthOptions(
      deps({ env: { ...testEnv, CUSTOMER_AUTH_SECRET: undefined } }),
    );
    expect(fallback.secret).toBe(OWNER_SECRET);
  });

  it("enables email sign-up with the 8–128 password rule and signs the new customer in", () => {
    expect(createCustomerAuthOptions(deps()).emailAndPassword).toEqual({
      enabled: true,
      disableSignUp: false,
      minPasswordLength: 8,
      maxPasswordLength: 128,
      autoSignIn: true,
    });
  });

  it("uses the owner's 8 h sliding sessions without a cookie cache (A8)", () => {
    expect(createCustomerAuthOptions(deps()).session).toMatchObject({
      expiresIn: 28_800,
      updateAge: 3_600,
      cookieCache: { enabled: false },
    });
  });

  it("maps every model to the snake_case customer_* tables, never the admin_* ones", () => {
    const options = createCustomerAuthOptions(deps());
    expect(options.user.modelName).toBe("customer_users");
    expect(options.session.modelName).toBe("customer_sessions");
    expect(options.account.modelName).toBe("customer_accounts");
    expect(options.verification.modelName).toBe("customer_verifications");
    expect(options.rateLimit.modelName).toBe("customer_rate_limits");
    expect(options.user.fields.emailVerified).toBe("email_verified");
    expect(options.session.fields.userId).toBe("user_id");
    expect(options.account.fields.refreshTokenExpiresAt).toBe("refresh_token_expires_at");
    expect(options.rateLimit.fields.lastRequest).toBe("last_request");
    // The same column mapping as the owner instance: only the table prefix differs.
    const owner = createAuthOptions(deps());
    expect(options.session.fields).toEqual(owner.session.fields);
    expect(options.account.fields).toEqual(owner.account.fields);
    expect(JSON.stringify(options)).not.toContain("admin_");
  });

  it("never lets a request set the role, which defaults to customer", () => {
    expect(createCustomerAuthOptions(deps()).user.additionalFields.role).toEqual({
      type: "string",
      input: false,
      defaultValue: "customer",
      required: true,
    });
  });

  it("without a trusted IP header ignores forwarded headers and limits sign-in and sign-up globally", () => {
    const options = createCustomerAuthOptions(deps());
    expect(options.advanced.ipAddress.ipAddressHeaders).toEqual([]);
    expect(options.rateLimit).toMatchObject({ enabled: true, storage: "database" });
    expect(options.rateLimit.customRules).toEqual({
      "/sign-in/email": { window: 60, max: SIGN_IN_LIMIT.shared },
      "/sign-up/email": { window: 60, max: SIGN_IN_LIMIT.shared },
    });
  });

  it("with a trusted IP header limits sign-in and sign-up per client IP", () => {
    const options = createCustomerAuthOptions(
      deps({ env: { ...testEnv, AUTH_TRUSTED_IP_HEADER: "x-real-ip" } }),
    );
    expect(options.advanced.ipAddress.ipAddressHeaders).toEqual(["x-real-ip"]);
    expect(options.rateLimit.customRules["/sign-in/email"]?.max).toBe(SIGN_IN_LIMIT.perIp);
    expect(options.rateLimit.customRules["/sign-up/email"]?.max).toBe(SIGN_IN_LIMIT.perIp);
  });

  it("logs at warn level with its own tag, never the library's other arguments", () => {
    const log = vi.fn();
    const { logger } = createCustomerAuthOptions(deps({ log }));
    expect(logger.level).toBe("warn");
    logger.log("warn", "User already exists", { email: "someone@shop.example" });
    expect(log).toHaveBeenCalledWith(
      "warn",
      "[better-auth:customer] User already exists",
      undefined,
    );
  });

  it("overwrites any name and image of a new user with the fixed values (A7, spike b)", async () => {
    const before = createCustomerAuthOptions(deps()).databaseHooks.user.create.before;
    await expect(
      before({ email: "a@shop.example", name: "<b>Mallory</b>", image: "https://evil.example/x" }),
    ).resolves.toEqual({ data: { email: "a@shop.example", name: CUSTOMER_NAME, image: null } });
    expect(CUSTOMER_NAME).toBe("Customer");
  });

  it("disables every listed path, and none of the four the customer area uses", () => {
    const options = createCustomerAuthOptions(deps());
    expect(options.disabledPaths).toBe(CUSTOMER_DISABLED_PATHS);
    expect(
      CUSTOMER_ENABLED_ENDPOINTS.map((endpoint) => `${endpoint.method} ${endpoint.path}`),
    ).toEqual(["POST /sign-up/email", "POST /sign-in/email", "POST /sign-out", "GET /get-session"]);
    for (const { path } of CUSTOMER_ENABLED_ENDPOINTS) {
      expect(CUSTOMER_DISABLED_PATHS).not.toContain(path);
    }
  });
});

describe("createCustomerAuth", () => {
  const auth = createCustomerAuth(deps());

  it("builds an instance with the HTTP handler and the server API", () => {
    expect(typeof auth.handler).toBe("function");
    expect(typeof auth.api.getSession).toBe("function");
  });

  // A library upgrade that adds an endpoint fails here until its path is enabled or disabled
  // on purpose (spec A1, spike h).
  it("lists every fixed library path as either enabled or disabled", () => {
    const paths = Object.values(auth.api)
      .map((endpoint: unknown) => Reflect.get(Object(endpoint), "path"))
      .filter((path): path is string => typeof path === "string");
    const fixed = paths.filter((path) => !path.includes(":"));
    const enabled: string[] = CUSTOMER_ENABLED_ENDPOINTS.map((endpoint) => endpoint.path);
    expect(
      fixed.filter((path) => !enabled.includes(path) && !CUSTOMER_DISABLED_PATHS.includes(path)),
    ).toEqual([]);
    expect(enabled.every((path) => fixed.includes(path))).toBe(true);
    // Only the route allowlist stops these two (disabledPaths matches exact strings).
    expect(paths.filter((path) => path.includes(":")).sort()).toEqual([
      "/callback/:id",
      "/reset-password/:token",
    ]);
  });
});
