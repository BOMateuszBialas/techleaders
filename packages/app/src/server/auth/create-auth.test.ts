import { describe, expect, it, vi } from "vitest";
import {
  createAuth,
  createAuthOptions,
  SIGN_IN_LIMIT,
  SIGN_IN_PATH,
  type AuthDeps,
} from "./create-auth";
import { createAuthPool } from "./create-auth-pool";

// Nothing listens on port 1, and nothing in these tests opens a connection.
const pool = createAuthPool("postgresql://nobody@127.0.0.1:1/none");
const env = {
  APP_URL: "https://shop.example",
  BETTER_AUTH_SECRET: "s".repeat(32),
  AUTH_TRUSTED_IP_HEADER: undefined,
};
const deps = (overrides: Partial<AuthDeps> = {}): AuthDeps => ({
  pool,
  env,
  log: vi.fn(),
  ...overrides,
});

describe("createAuthOptions", () => {
  it("disables public sign-up and trusts only the app origin", () => {
    const options = createAuthOptions(deps());
    expect(options.emailAndPassword).toMatchObject({ enabled: true, disableSignUp: true });
    expect(options.baseURL).toBe(env.APP_URL);
    expect(options.trustedOrigins).toEqual([env.APP_URL]);
    expect(options.secret).toBe(env.BETTER_AUTH_SECRET);
    expect(options.database).toBe(pool);
    expect(options.advanced.disableOriginCheck).toBe(false);
  });

  it("uses 8 h sessions renewed hourly, without a cookie cache", () => {
    expect(createAuthOptions(deps()).session).toMatchObject({
      expiresIn: 28_800,
      updateAge: 3_600,
      cookieCache: { enabled: false },
    });
  });

  it("maps every model to the snake_case admin_* tables", () => {
    const options = createAuthOptions(deps());
    expect(options.user.modelName).toBe("admin_users");
    expect(options.user.fields.emailVerified).toBe("email_verified");
    expect(options.session.fields.userId).toBe("user_id");
    expect(options.account.fields.refreshTokenExpiresAt).toBe("refresh_token_expires_at");
    expect(options.verification.modelName).toBe("admin_verifications");
    expect(options.rateLimit.fields.lastRequest).toBe("last_request");
  });

  it("never lets a request set the role", () => {
    expect(createAuthOptions(deps()).user.additionalFields.role).toMatchObject({
      input: false,
      defaultValue: "owner",
    });
  });

  it("without a trusted IP header ignores forwarded headers and limits sign-in globally", () => {
    const options = createAuthOptions(deps());
    expect(options.advanced.ipAddress.ipAddressHeaders).toEqual([]);
    expect(options.rateLimit).toMatchObject({ enabled: true, storage: "database" });
    expect(options.rateLimit.customRules[SIGN_IN_PATH]).toEqual({
      window: 60,
      max: SIGN_IN_LIMIT.shared,
    });
  });

  it("with a trusted IP header limits sign-in per client IP", () => {
    const options = createAuthOptions(
      deps({ env: { ...env, AUTH_TRUSTED_IP_HEADER: "x-real-ip" } }),
    );
    expect(options.advanced.ipAddress.ipAddressHeaders).toEqual(["x-real-ip"]);
    expect(options.rateLimit.customRules[SIGN_IN_PATH]?.max).toBe(SIGN_IN_LIMIT.perIp);
  });

  it("forwards only the library's message to the injected logger", () => {
    const log = vi.fn();
    createAuthOptions(deps({ log })).logger.log("warn", "Invalid password");
    expect(log).toHaveBeenCalledWith("warn", "[better-auth] Invalid password");
  });
});

describe("createAuth", () => {
  it("builds an instance with the HTTP handler and the server API", () => {
    const auth = createAuth(deps());
    expect(typeof auth.handler).toBe("function");
    expect(typeof auth.api.getSession).toBe("function");
  });
});
