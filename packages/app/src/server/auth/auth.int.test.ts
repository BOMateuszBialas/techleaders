import { execFile } from "node:child_process";
import { fileURLToPath } from "node:url";
import { promisify } from "node:util";
import { afterAll, beforeAll, beforeEach, describe, expect, inject, it } from "vitest";
import { createAuth, OWNER_NAME, SIGN_IN_LIMIT, type Auth, type AuthEnv } from "./create-auth";
import { createAuthPool } from "./create-auth-pool";

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
const EMAIL = "owner@auth-int.test";
const PASSWORD = "correct-horse-battery-staple";
const databaseUrl = inject("databaseUrl");
const pool = createAuthPool(databaseUrl);
const logs: string[] = [];

function buildAuth(env: Partial<AuthEnv> = {}): Auth {
  return createAuth({
    pool,
    env: { APP_URL, BETTER_AUTH_SECRET: "i".repeat(32), AUTH_TRUSTED_IP_HEADER: undefined, ...env },
    log: (level, message) => logs.push(`${level} ${message}`),
  });
}

// Built after the migrations: Better Auth checks the schema when it first initialises.
let auth: Auth;

type Call = { body?: unknown; headers?: Record<string, string>; origin?: string };
function http(
  target: Auth,
  path: string,
  { body = {}, headers = {}, origin = APP_URL }: Call = {},
) {
  return target.handler(
    new Request(`${APP_URL}/api/auth${path}`, {
      method: "POST",
      headers: { "content-type": "application/json", origin, ...headers },
      body: JSON.stringify(body),
    }),
  );
}
const signIn = (password: string, call: Call & { email?: string } = {}, target?: Auth) =>
  http(target ?? auth, "/sign-in/email", {
    ...call,
    body: { email: call.email ?? EMAIL, password },
  });
const cookieOf = (response: Response) =>
  response.headers
    .getSetCookie()
    .map((cookie) => cookie.split(";")[0])
    .join("; ");
const sessionOf = (cookie: string) => auth.api.getSession({ headers: new Headers({ cookie }) });

describe("Better Auth against PostgreSQL", () => {
  beforeAll(async () => {
    // Real migrations through the database CLI (app code must not import the database package).
    await run(process.execPath, [tsxCli, "packages/database/src/cli/migrate.ts", "up"], {
      cwd: repoRoot,
      env: { ...process.env, DATABASE_URL: databaseUrl },
    });
    await pool.query("delete from admin_users where email like '%@auth-int.test'");
    auth = buildAuth();
    const ctx = await auth.$context;
    const user = await ctx.internalAdapter.createUser(
      { email: EMAIL, name: OWNER_NAME, emailVerified: true },
      { method: "admin" },
    );
    await ctx.internalAdapter.linkAccount({
      userId: user.id,
      providerId: "credential",
      accountId: user.id,
      password: await ctx.password.hash(PASSWORD),
    });
  });

  beforeEach(async () => {
    await pool.query("delete from admin_rate_limits");
  });

  afterAll(async () => {
    await pool.end();
  });

  it("signs the owner in, sets an 8 h HttpOnly cookie and stores the session", async () => {
    const response = await signIn(PASSWORD);
    expect(response.status).toBe(200);
    expect(response.headers.getSetCookie().join()).toMatch(/Max-Age=28800.*HttpOnly.*SameSite=Lax/);

    const session = await sessionOf(cookieOf(response));
    expect(session?.user).toMatchObject({ email: EMAIL, role: "owner", name: OWNER_NAME });
    const rows = await pool.query("select 1 from admin_sessions where token = $1", [
      session?.session.token,
    ]);
    expect(rows.rowCount).toBe(1);
  });

  it("answers a wrong password and an unknown email identically (AC3)", async () => {
    const wrong = await signIn("wrong-password-123");
    const unknown = await signIn("wrong-password-123", { email: "nobody@auth-int.test" });
    expect(wrong.status).toBe(401);
    expect(await wrong.text()).toBe(await unknown.text());
    expect(unknown.status).toBe(401);
  });

  it("extends a session used after an hour and rejects an expired one", async () => {
    const cookie = cookieOf(await signIn(PASSWORD));
    const token = (await sessionOf(cookie))?.session.token;
    await pool.query(
      "update admin_sessions set expires_at = now() + interval '7000 seconds' where token = $1",
      [token],
    );
    await sessionOf(cookie);
    const renewed = await pool.query<{ left: number }>(
      "select extract(epoch from expires_at - now()) as left from admin_sessions where token = $1",
      [token],
    );
    expect(Number(renewed.rows[0]?.left)).toBeGreaterThan(28_000);

    await pool.query(
      "update admin_sessions set expires_at = now() - interval '1 second' where token = $1",
      [token],
    );
    expect(await sessionOf(cookie)).toBeNull();
  });

  it("deletes the session on sign-out, so the cookie stops working (AC4)", async () => {
    const cookie = cookieOf(await signIn(PASSWORD));
    const token = (await sessionOf(cookie))?.session.token;
    const response = await http(auth, "/sign-out", { headers: { cookie } });
    expect(response.status).toBe(200);
    expect(await sessionOf(cookie)).toBeNull();
    expect(
      (await pool.query("select 1 from admin_sessions where token = $1", [token])).rowCount,
    ).toBe(0);
  });

  it("keeps two sessions apart", async () => {
    const [a, b] = await Promise.all([signIn(PASSWORD), signIn(PASSWORD)]);
    const [first, second] = await Promise.all([sessionOf(cookieOf(a!)), sessionOf(cookieOf(b!))]);
    expect(first?.session.token).toBeTruthy();
    expect(first?.session.token).not.toBe(second?.session.token);
  });

  it("refuses public sign-up and sign-in from a foreign origin", async () => {
    const signUp = await http(auth, "/sign-up/email", {
      body: { email: "intruder@auth-int.test", password: PASSWORD, name: "x" },
    });
    expect(signUp.status).toBe(400);
    expect((await signIn(PASSWORD, { origin: "https://evil.example" })).status).toBe(403);
  });

  it("without a trusted IP header shares one bucket, so forged X-Forwarded-For does not help", async () => {
    const statuses: number[] = [];
    for (let i = 0; i <= SIGN_IN_LIMIT.shared; i++) {
      const response = await signIn("wrong-password-123", {
        headers: { "x-forwarded-for": `10.0.0.${i + 1}` },
      });
      statuses.push(response.status);
    }
    expect(statuses.at(-2)).toBe(401);
    expect(statuses.at(-1)).toBe(429);
  });

  it("with a trusted IP header limits each client IP to 5 attempts a minute", async () => {
    const proxied = buildAuth({ AUTH_TRUSTED_IP_HEADER: "x-real-ip" });
    const attempt = (ip: string) =>
      signIn("wrong-password-123", { headers: { "x-real-ip": ip } }, proxied);
    for (let i = 0; i < SIGN_IN_LIMIT.perIp; i++) {
      expect((await attempt("203.0.113.7")).status).toBe(401);
    }
    expect((await attempt("203.0.113.7")).status).toBe(429);
    expect((await attempt("203.0.113.8")).status).toBe(401);
  });

  it("logs failed attempts through the injected logger without the email", () => {
    expect(logs.some((line) => line.startsWith("warn [better-auth]"))).toBe(true);
    expect(logs.join("\n")).not.toContain(EMAIL);
  });
});
