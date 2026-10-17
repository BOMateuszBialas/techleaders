import { afterAll, describe, expect, it, vi } from "vitest";
import {
  createAuth,
  createAuthOptions,
  SIGN_IN_LIMIT,
  SIGN_IN_PATH,
  summarizeAuthError,
  type AuthDeps,
} from "./create-auth";
import { createAuthPool } from "./create-auth-pool";

// Nothing listens on port 1, and nothing in these tests opens a connection.
const pool = createAuthPool("postgresql://nobody@127.0.0.1:1/none");
afterAll(() => pool.end());
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
    createAuthOptions(deps({ log })).logger.log("warn", "Invalid password", {
      email: "owner@shop.example",
    });
    expect(log).toHaveBeenCalledWith("warn", "[better-auth] Invalid password", undefined);
  });

  // #57: getSession logs "INTERNAL_SERVER_ERROR" with the error that made it fail.
  it("adds a summary of the error behind an internal error, never the other arguments", () => {
    const log = vi.fn();
    createAuthOptions(deps({ log })).logger.log(
      "error",
      "INTERNAL_SERVER_ERROR",
      { cookie: "better-auth.session_token=secret" },
      new Error("Cannot use a pool after calling end on the pool"),
    );
    expect(log).toHaveBeenCalledWith("error", "[better-auth] INTERNAL_SERVER_ERROR", {
      name: "Error",
      message: "Cannot use a pool after calling end on the pool",
    });
    expect(JSON.stringify(log.mock.calls)).not.toContain("secret");
  });
});

describe("summarizeAuthError", () => {
  it("keeps a driver error's class, SQLSTATE and constraint, never its message", () => {
    const driverError = Object.assign(new Error("Key (email)=(owner@shop.example) exists"), {
      name: "DatabaseError",
      code: "23505",
      constraint: "admin_users_email_unique",
    });
    expect(summarizeAuthError(driverError)).toEqual({
      name: "DatabaseError",
      code: "23505",
      constraint: "admin_users_email_unique",
    });
  });

  it("drops the message of an ORM exception and of a network error", () => {
    const orm = new Error("insert into admin_sessions values ('token-123')");
    orm.name = "DriverException";
    expect(summarizeAuthError(orm)).toEqual({ name: "DriverException" });
    const network = Object.assign(new Error("connect ECONNREFUSED 10.0.0.5:5432"), {
      code: "ECONNREFUSED",
    });
    expect(summarizeAuthError(network)).toEqual({ name: "Error", code: "ECONNREFUSED" });
  });

  it("follows a bounded cause chain and truncates long messages", () => {
    let error: Error = new Error("x".repeat(500));
    for (let i = 0; i < 5; i++) error = new Error(`level ${i}`, { cause: error });
    const summary = summarizeAuthError(error);
    expect(summary?.message).toBe("level 4");
    expect(summary?.cause?.cause?.cause?.message).toBe("level 1");
    expect(summary?.cause?.cause?.cause?.cause).toBeUndefined();
    expect(summarizeAuthError(new Error("y".repeat(500)))?.message).toHaveLength(200);
  });

  it("keeps no message once a driver error is anywhere in the chain", () => {
    const driver = Object.assign(new Error("insert ... values ('owner@shop.example')"), {
      code: "23505",
    });
    const wrapper = new Error(`Failed to create session: ${driver.message}`, { cause: driver });
    expect(summarizeAuthError(wrapper)).toEqual({
      name: "Error",
      cause: { name: "Error", code: "23505" },
    });
  });

  it("keeps no message for an error class that may quote its input", () => {
    expect(summarizeAuthError(new SyntaxError('Unexpected token in JSON at "owner@s'))).toEqual({
      name: "SyntaxError",
    });
  });

  it("ignores values that are not errors", () => {
    expect(summarizeAuthError("text")).toBeUndefined();
    expect(summarizeAuthError({ message: "plain object" })).toBeUndefined();
  });
});

describe("createAuth", () => {
  it("builds an instance with the HTTP handler and the server API", () => {
    const auth = createAuth(deps());
    expect(typeof auth.handler).toBe("function");
    expect(typeof auth.api.getSession).toBe("function");
  });
});
