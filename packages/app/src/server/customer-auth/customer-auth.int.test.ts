import { execFile } from "node:child_process";
import { fileURLToPath } from "node:url";
import { promisify } from "node:util";
import { afterAll, beforeAll, describe, expect, inject, it, vi } from "vitest";
import { createAuth, OWNER_NAME, SIGN_IN_LIMIT, type Auth } from "../auth/create-auth";
import { createAuthPool } from "../auth/create-auth-pool";
import { getCurrentAdmin } from "../auth/require-admin";
import { createCustomerAuth, type CustomerAuth } from "./create-customer-auth";
import { getCurrentCustomer, getCurrentCustomerId } from "./require-customer";

// Mirrors the augmentation in `@commerceos/database/testing`, which app code must not import.
declare module "vitest" {
  export interface ProvidedContext {
    databaseUrl: string;
  }
}

/**
 * Cross-role isolation (E07 spec step 5): the real owner and customer Better Auth instances on
 * one pool with separate secrets, read through the real guards. Only the request (its cookie
 * header) and the container lookup are faked.
 */
let requestCookie = "";
vi.mock("next/headers", () => ({
  headers: vi.fn(async () => new Headers(requestCookie ? { cookie: requestCookie } : {})),
}));
vi.mock("../container", () => ({ getAuth: vi.fn(), getCustomerAuth: vi.fn() }));

const run = promisify(execFile);
const repoRoot = fileURLToPath(new URL("../../../../../", import.meta.url));
const tsxCli = fileURLToPath(new URL("node_modules/tsx/dist/cli.mjs", `file:///${repoRoot}`));

const APP_URL = "http://localhost:3000";
const OWNER_EMAIL = "owner@cross-role-int.test";
const CUSTOMER_EMAIL = "customer@cross-role-int.test";
const PASSWORD = "correct-horse-battery-staple";
const pool = createAuthPool(inject("databaseUrl"));
const env = {
  APP_URL,
  BETTER_AUTH_SECRET: "o".repeat(32),
  CUSTOMER_AUTH_SECRET: "c".repeat(32),
  AUTH_TRUSTED_IP_HEADER: undefined,
};
const log = () => {};

let owner: Auth;
let customer: CustomerAuth;
let ownerCookie: string;
let customerCookie: string;

const post = (target: Auth | CustomerAuth, url: string, body: unknown) =>
  target.handler(
    new Request(`${APP_URL}${url}`, {
      method: "POST",
      headers: { "content-type": "application/json", origin: APP_URL },
      body: JSON.stringify(body),
    }),
  );
const cookieOf = (response: Response) =>
  response.headers
    .getSetCookie()
    .map((cookie) => cookie.split(";")[0])
    .join("; ");
/** The raw value of one cookie in a `Cookie` header. */
const valueOf = (cookieHeader: string, name: string) =>
  cookieHeader
    .split("; ")
    .find((pair) => pair.startsWith(`${name}=`))!
    .slice(name.length + 1);

async function as(cookie: string) {
  requestCookie = cookie;
  return {
    admin: await getCurrentAdmin(),
    customer: await getCurrentCustomer(),
    customerId: await getCurrentCustomerId(),
  };
}

describe("owner and customer sessions never cross (E07 step 5)", () => {
  beforeAll(async () => {
    await run(process.execPath, [tsxCli, "packages/database/src/cli/migrate.ts", "up"], {
      cwd: repoRoot,
      env: { ...process.env, DATABASE_URL: inject("databaseUrl") },
    });
    await pool.query("delete from admin_users where email like '%@cross-role-int.test'");
    await pool.query("delete from customer_users where email like '%@cross-role-int.test'");
    await pool.query("delete from admin_rate_limits");
    await pool.query("delete from customer_rate_limits");

    owner = createAuth({ pool, env, log });
    customer = createCustomerAuth({ pool, env, log });
    const { getAuth, getCustomerAuth } = await import("../container");
    vi.mocked(getAuth).mockReturnValue(owner);
    vi.mocked(getCustomerAuth).mockReturnValue(customer);

    const ctx = await owner.$context;
    const user = await ctx.internalAdapter.createUser(
      { email: OWNER_EMAIL, name: OWNER_NAME, emailVerified: true },
      { method: "admin" },
    );
    await ctx.internalAdapter.linkAccount({
      userId: user.id,
      providerId: "credential",
      accountId: user.id,
      password: await ctx.password.hash(PASSWORD),
    });
    ownerCookie = cookieOf(
      await post(owner, "/api/auth/sign-in/email", { email: OWNER_EMAIL, password: PASSWORD }),
    );
    customerCookie = cookieOf(
      await post(customer, "/api/customer-auth/sign-up/email", {
        email: CUSTOMER_EMAIL,
        password: PASSWORD,
        name: "Customer",
      }),
    );
    expect(ownerCookie).toMatch(/^better-auth\.session_token=/);
    expect(customerCookie).toMatch(/^commerceos-customer\.session_token=/);
  });

  afterAll(async () => {
    await pool.end();
  });

  it("a customer cookie alone is a customer, never an admin", async () => {
    const seen = await as(customerCookie);
    expect(seen.admin).toBeNull();
    expect(seen.customer).toMatchObject({ email: CUSTOMER_EMAIL, role: "customer" });
    expect(seen.customerId).toMatchObject({ status: "customer", email: CUSTOMER_EMAIL });
  });

  it("an owner cookie alone is an admin, never a customer", async () => {
    const seen = await as(ownerCookie);
    expect(seen.admin).toMatchObject({ email: OWNER_EMAIL, role: "owner" });
    expect(seen.customer).toBeNull();
    expect(seen.customerId).toEqual({ status: "none" });
  });

  it("a token moved under the other role's cookie name is no session, in both directions", async () => {
    const ownerToken = valueOf(ownerCookie, "better-auth.session_token");
    const customerToken = valueOf(customerCookie, "commerceos-customer.session_token");

    const ownerTokenAsCustomer = await as(`commerceos-customer.session_token=${ownerToken}`);
    expect(ownerTokenAsCustomer.customer).toBeNull();
    expect(ownerTokenAsCustomer.admin).toBeNull();
    expect(ownerTokenAsCustomer.customerId).toEqual({ status: "none" });

    const customerTokenAsOwner = await as(`better-auth.session_token=${customerToken}`);
    expect(customerTokenAsOwner.admin).toBeNull();
    expect(customerTokenAsOwner.customer).toBeNull();
  });

  it("with both cookies, each guard sees only its own principal", async () => {
    const seen = await as(`${ownerCookie}; ${customerCookie}`);
    expect(seen.admin).toMatchObject({ email: OWNER_EMAIL, role: "owner" });
    expect(seen.customer).toMatchObject({ email: CUSTOMER_EMAIL, role: "customer" });
    expect(seen.admin?.id).not.toBe(seen.customer?.id);
  });

  it("a flood of customer sign-ins never locks the owner out (separate buckets, A10)", async () => {
    await pool.query("delete from customer_rate_limits");
    await pool.query("delete from admin_rate_limits");
    const statuses: number[] = [];
    for (let i = 0; i <= SIGN_IN_LIMIT.shared; i++) {
      const response = await post(customer, "/api/customer-auth/sign-in/email", {
        email: CUSTOMER_EMAIL,
        password: "wrong-password-123",
      });
      statuses.push(response.status);
    }
    expect(statuses.at(-1)).toBe(429);
    const ownerSignIn = await post(owner, "/api/auth/sign-in/email", {
      email: OWNER_EMAIL,
      password: PASSWORD,
    });
    expect(ownerSignIn.status).toBe(200);
  });

  it("no cookie is neither role", async () => {
    const seen = await as("");
    expect(seen).toEqual({ admin: null, customer: null, customerId: { status: "none" } });
  });

  it("a customer sign-out ends only the customer session", async () => {
    const response = await customer.handler(
      new Request(`${APP_URL}/api/customer-auth/sign-out`, {
        method: "POST",
        headers: {
          "content-type": "application/json",
          origin: APP_URL,
          cookie: `${ownerCookie}; ${customerCookie}`,
        },
        body: "{}",
      }),
    );
    expect(response.status).toBe(200);
    const expired = response.headers.getSetCookie().map((cookie) => cookie.split("=")[0]);
    expect(expired.length).toBeGreaterThan(0);
    expect(expired.every((name) => name?.startsWith("commerceos-customer."))).toBe(true);

    const seen = await as(`${ownerCookie}; ${customerCookie}`);
    expect(seen.customer).toBeNull();
    expect(seen.admin).toMatchObject({ email: OWNER_EMAIL });
  });
});
