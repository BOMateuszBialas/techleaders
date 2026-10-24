import { execFile } from "node:child_process";
import { fileURLToPath } from "node:url";
import { promisify } from "node:util";
import { afterAll, beforeAll, beforeEach, describe, expect, it, inject } from "vitest";
import { SIGN_IN_LIMIT } from "../auth/create-auth";
import { createAuthPool } from "../auth/create-auth-pool";
import {
  CUSTOMER_NAME,
  createCustomerAuth,
  type CustomerAuth,
  type CustomerAuthEnv,
} from "./create-customer-auth";

// Mirrors the augmentation in `@commerceos/database/testing`, which app code must not import.
declare module "vitest" {
  export interface ProvidedContext {
    databaseUrl: string;
  }
}

const run = promisify(execFile);
const repoRoot = fileURLToPath(new URL("../../../../../", import.meta.url));
const tsxCli = fileURLToPath(new URL("node_modules/tsx/dist/cli.mjs", `file:///${repoRoot}`));

const APP_URL = "http://localhost:3000";
const DOMAIN = "@customer-auth-int.test";
const PASSWORD = "correct-horse-battery-staple";
const databaseUrl = inject("databaseUrl");
const pool = createAuthPool(databaseUrl);
const logs: string[] = [];

function buildCustomerAuth(overrides: Partial<CustomerAuthEnv> = {}): CustomerAuth {
  return createCustomerAuth({
    pool,
    env: {
      APP_URL,
      BETTER_AUTH_SECRET: "o".repeat(32),
      CUSTOMER_AUTH_SECRET: "c".repeat(32),
      AUTH_TRUSTED_IP_HEADER: undefined,
      ...overrides,
    },
    log: (level, message) => logs.push(`${level} ${message}`),
  });
}

// Built after the migrations: Better Auth checks the schema when it first initialises.
let auth: CustomerAuth;

type Call = { body?: unknown; headers?: Record<string, string>; origin?: string; method?: string };
function http(path: string, call: Call = {}, target: CustomerAuth = auth) {
  const { body = {}, headers = {}, origin = APP_URL, method = "POST" } = call;
  return target.handler(
    new Request(`${APP_URL}/api/customer-auth${path}`, {
      method,
      headers: { "content-type": "application/json", origin, ...headers },
      ...(method === "GET" ? {} : { body: JSON.stringify(body) }),
    }),
  );
}
const signUp = (email: string, extra: Record<string, unknown> = {}, call: Call = {}) =>
  http("/sign-up/email", {
    ...call,
    body: { email, password: PASSWORD, name: CUSTOMER_NAME, ...extra },
  });
const signIn = (email: string, password = PASSWORD, call: Call = {}, target?: CustomerAuth) =>
  http("/sign-in/email", { ...call, body: { email, password } }, target);
const cookieOf = (response: Response) =>
  response.headers
    .getSetCookie()
    .map((cookie) => cookie.split(";")[0])
    .join("; ");
const sessionOf = (cookie: string) => auth.api.getSession({ headers: new Headers({ cookie }) });
const userRow = async (email: string) =>
  (
    await pool.query<{
      id: string;
      role: string;
      name: string;
      image: string | null;
      email: string;
    }>("select id, role, name, image, email from customer_users where email = $1", [email])
  ).rows[0];
let counter = 0;
const freshEmail = (label: string) => `${label}-${++counter}${DOMAIN}`;

describe("customer Better Auth instance against PostgreSQL (E07 step 4)", () => {
  beforeAll(async () => {
    // Real migrations through the database CLI (app code must not import the database package).
    await run(process.execPath, [tsxCli, "packages/database/src/cli/migrate.ts", "up"], {
      cwd: repoRoot,
      env: { ...process.env, DATABASE_URL: databaseUrl },
    });
    await pool.query(`delete from customer_users where email like '%${DOMAIN}'`);
    auth = buildCustomerAuth();
  });

  beforeEach(async () => {
    await pool.query("delete from customer_rate_limits");
  });

  afterAll(async () => {
    await pool.end();
  });

  it("signs a customer up with the customer role, an 8 h HttpOnly cookie and a session", async () => {
    const email = freshEmail("new");
    const response = await signUp(email);
    expect(response.status).toBe(200);
    const setCookie = response.headers.getSetCookie().join();
    expect(setCookie).toMatch(/^commerceos-customer\.session_token=/);
    expect(setCookie).toMatch(/Max-Age=28800.*HttpOnly.*SameSite=Lax/);
    expect(setCookie).not.toContain("better-auth.");

    const session = await sessionOf(cookieOf(response));
    expect(session?.user).toMatchObject({ email, role: "customer", name: CUSTOMER_NAME });
    expect(await userRow(email)).toMatchObject({ role: "customer", name: "Customer", image: null });
    const rows = await pool.query("select 1 from customer_sessions where token = $1", [
      session?.session.token,
    ]);
    expect(rows.rowCount).toBe(1);
  });

  it("ignores a role, name or image in the sign-up body (spike b, A7)", async () => {
    const email = freshEmail("owner-claim");
    const response = await signUp(email, {
      role: "owner",
      name: "<b>Mallory</b>",
      image: "https://evil.example/x.png",
      emailVerified: true,
    });
    expect(response.status).toBe(200);
    expect(await userRow(email)).toMatchObject({
      role: "customer",
      name: "Customer",
      image: null,
    });
    const verified = await pool.query<{ email_verified: boolean }>(
      "select email_verified from customer_users where email = $1",
      [email],
    );
    expect(verified.rows[0]?.email_verified).toBe(false);
    // No owner was created anywhere.
    expect((await pool.query("select 1 from admin_users where email = $1", [email])).rowCount).toBe(
      0,
    );
  });

  it("refuses a duplicate email with the library's explicit error (accepted risk A9, spike f)", async () => {
    const email = freshEmail("dup");
    expect((await signUp(email)).status).toBe(200);
    const duplicate = await signUp(email);
    expect(duplicate.status).toBe(422);
    expect(await duplicate.json()).toMatchObject({ code: "USER_ALREADY_EXISTS_USE_ANOTHER_EMAIL" });
    expect(
      (await pool.query("select 1 from customer_users where email = $1", [email])).rowCount,
    ).toBe(1);
  });

  it("signs in, and answers a wrong password and an unknown email identically", async () => {
    const email = freshEmail("sign-in");
    await signUp(email);
    const ok = await signIn(email);
    expect(ok.status).toBe(200);
    expect((await sessionOf(cookieOf(ok)))?.user.email).toBe(email);

    const wrong = await signIn(email, "wrong-password-123");
    const unknown = await signIn(freshEmail("nobody"), "wrong-password-123");
    expect(wrong.status).toBe(401);
    expect(unknown.status).toBe(401);
    expect(await wrong.text()).toBe(await unknown.text());
  });

  it("deletes the session row on sign-out, so the cookie stops working", async () => {
    const email = freshEmail("sign-out");
    const cookie = cookieOf(await signUp(email));
    const token = (await sessionOf(cookie))?.session.token;
    const response = await http("/sign-out", { headers: { cookie } });
    expect(response.status).toBe(200);
    expect(await sessionOf(cookie)).toBeNull();
    expect(
      (await pool.query("select 1 from customer_sessions where token = $1", [token])).rowCount,
    ).toBe(0);
  });

  it("revokes a session whose row is deleted on the very next request (cookie cache off, A8)", async () => {
    const cookie = cookieOf(await signUp(freshEmail("revoked")));
    const token = (await sessionOf(cookie))?.session.token;
    expect(token).toBeTruthy();
    await pool.query("delete from customer_sessions where token = $1", [token]);
    expect(await sessionOf(cookie)).toBeNull();
    const response = await http("/get-session", { method: "GET", headers: { cookie } });
    expect(response.status).toBe(200);
    expect(await response.json()).toBeNull();
  });

  it("keeps two concurrent customers apart", async () => {
    const [a, b] = [freshEmail("a"), freshEmail("b")];
    const [cookieA, cookieB] = [cookieOf(await signUp(a)), cookieOf(await signUp(b))];
    const [sessionA, sessionB] = await Promise.all([sessionOf(cookieA), sessionOf(cookieB)]);
    expect(sessionA?.user.email).toBe(a);
    expect(sessionB?.user.email).toBe(b);
  });

  it("refuses sign-up and sign-in from a foreign origin", async () => {
    const email = freshEmail("origin");
    expect((await signUp(email, {}, { origin: "https://evil.example" })).status).toBe(403);
    expect(await userRow(email)).toBeUndefined();
    await signUp(email);
    expect((await signIn(email, PASSWORD, { origin: "https://evil.example" })).status).toBe(403);
  });

  it("answers 404 on disabled library paths and changes nothing (A1, spike h)", async () => {
    const email = freshEmail("disabled");
    const cookie = cookieOf(await signUp(email));
    const before = await userRow(email);
    for (const [path, body] of [
      ["/update-user", { role: "owner", name: "x", image: "https://evil.example/x.png" }],
      ["/change-email", { newEmail: freshEmail("changed") }],
      ["/change-password", { currentPassword: PASSWORD, newPassword: "another-password-1" }],
      ["/list-sessions", {}],
      ["/revoke-sessions", {}],
      ["/delete-user", {}],
      ["/request-password-reset", { email }],
    ] as const) {
      expect((await http(path, { body, headers: { cookie } })).status).toBe(404);
      expect((await http(path, { method: "GET", headers: { cookie } })).status).toBe(404);
    }
    expect(await userRow(email)).toEqual(before);
    expect(await sessionOf(cookie)).not.toBeNull();
  });

  it("without a trusted IP header shares one bucket per path, so a forged X-Forwarded-For does not help", async () => {
    const statuses = async (attempt: (i: number) => Promise<Response>) => {
      const result: number[] = [];
      for (let i = 0; i <= SIGN_IN_LIMIT.shared; i++) result.push((await attempt(i)).status);
      return result;
    };
    const forged = (i: number) => ({ headers: { "x-forwarded-for": `10.0.0.${i + 1}` } });
    const signIns = await statuses((i) =>
      signIn(freshEmail("nobody"), "wrong-password-123", forged(i)),
    );
    expect(signIns.at(-2)).toBe(401);
    expect(signIns.at(-1)).toBe(429);
    // Refused sign-ups count too (spike e): a too-short password is a 400.
    const signUps = await statuses((i) =>
      http("/sign-up/email", {
        ...forged(i),
        body: { email: freshEmail("short"), password: "short", name: "x" },
      }),
    );
    expect(signUps.at(-2)).toBe(400);
    expect(signUps.at(-1)).toBe(429);
    const keys = await pool.query<{ key: string }>(
      "select key from customer_rate_limits order by key",
    );
    expect(keys.rows.map((row) => row.key.split("|").at(-1))).toEqual([
      "/sign-in/email",
      "/sign-up/email",
    ]);
  });

  it("with a trusted IP header limits each client IP to 5 sign-ins and 5 sign-ups a minute", async () => {
    const proxied = buildCustomerAuth({ AUTH_TRUSTED_IP_HEADER: "x-real-ip" });
    const from = (ip: string) => ({ headers: { "x-real-ip": ip } });
    for (let i = 0; i < SIGN_IN_LIMIT.perIp; i++) {
      expect(
        (await signIn(freshEmail("nobody"), "wrong-password-123", from("203.0.113.7"), proxied))
          .status,
      ).toBe(401);
    }
    expect(
      (await signIn(freshEmail("nobody"), "wrong-password-123", from("203.0.113.7"), proxied))
        .status,
    ).toBe(429);
    expect(
      (await signIn(freshEmail("nobody"), "wrong-password-123", from("203.0.113.8"), proxied))
        .status,
    ).toBe(401);

    const signUpFrom = (ip: string) =>
      http(
        "/sign-up/email",
        { ...from(ip), body: { email: freshEmail("per-ip"), password: PASSWORD, name: "x" } },
        proxied,
      );
    for (let i = 0; i < SIGN_IN_LIMIT.perIp; i++) {
      expect((await signUpFrom("203.0.113.9")).status).toBe(200);
    }
    expect((await signUpFrom("203.0.113.9")).status).toBe(429);
    expect((await signUpFrom("203.0.113.10")).status).toBe(200);
  });

  it("leaves no orphan user when the account or session insert fails (spike j)", async () => {
    for (const table of ["customer_accounts", "customer_sessions"]) {
      await pool.query(`
        create or replace function customer_auth_int_fail() returns trigger language plpgsql as $$
        begin raise exception 'forced failure'; end $$;
        create trigger customer_auth_int_fail before insert on ${table}
          for each row execute function customer_auth_int_fail();
      `);
      try {
        const email = freshEmail(`orphan-${table}`);
        const response = await signUp(email);
        expect(response.status).toBe(500);
        expect(response.headers.getSetCookie()).toEqual([]);
        expect(await userRow(email)).toBeUndefined();
      } finally {
        await pool.query(`drop trigger customer_auth_int_fail on ${table}`);
      }
    }
  });

  it("logs through the injected logger with its own tag and never an email", () => {
    expect(logs.some((line) => line.includes("[better-auth:customer]"))).toBe(true);
    expect(logs.join("\n")).not.toContain(DOMAIN);
  });
});
