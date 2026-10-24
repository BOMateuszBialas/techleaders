// SPIKE (E07 Phase 0, items d, h over HTTP, i): two Better Auth instances in a production
// `next start` with cacheComponents on. Throwaway branch only.
import { randomBytes } from "node:crypto";
import { mkdirSync, writeFileSync } from "node:fs";
import pg from "pg";
import { afterAll, beforeAll, describe, expect, inject, it } from "vitest";
import { useBrowser } from "./support/browser-test";
import "./support/provided-context";

const baseUrl = inject("baseUrl");
const results: Record<string, unknown> = {};
const db = new pg.Client({ connectionString: inject("databaseUrl") });
const A = { email: "a@e07-spike.test", password: randomBytes(12).toString("base64url") };
const B = { email: "b@e07-spike.test", password: randomBytes(12).toString("base64url") };
const ownerEmail = inject("ownerEmail");
const ownerPassword = inject("ownerPassword");

const pairs = (response: Response) =>
  response.headers
    .getSetCookie()
    .map((cookie) => cookie.split(";")[0])
    .join("; ");

async function customerSignUp(user: { email: string; password: string }): Promise<string> {
  const response = await fetch(`${baseUrl}/api/customer-auth/sign-up/email`, {
    method: "POST",
    headers: { "content-type": "application/json", origin: baseUrl },
    body: JSON.stringify({ ...user, name: "Customer" }),
  });
  expect(response.status).toBe(200);
  return pairs(response);
}

async function customerSignIn(user: { email: string; password: string }): Promise<string> {
  const response = await fetch(`${baseUrl}/api/customer-auth/sign-in/email`, {
    method: "POST",
    headers: { "content-type": "application/json", origin: baseUrl },
    body: JSON.stringify(user),
  });
  expect(response.status).toBe(200);
  return pairs(response);
}

async function ownerSignIn(): Promise<string> {
  const response = await fetch(`${baseUrl}/api/auth/sign-in/email`, {
    method: "POST",
    headers: { "content-type": "application/json", origin: baseUrl },
    body: JSON.stringify({ email: ownerEmail, password: ownerPassword }),
  });
  expect(response.status).toBe(200);
  return pairs(response);
}

async function sessions(cookie: string) {
  const get = async (path: string) => {
    const response = await fetch(`${baseUrl}${path}`, { headers: { cookie } });
    const body = (await response.json()) as { user?: { email: string } } | null;
    return body?.user?.email ?? null;
  };
  return {
    customer: await get("/api/customer-auth/get-session"),
    owner: await get("/api/auth/get-session"),
  };
}

/** The no-JavaScript server action id of the form with this id on /spike-e07. */
async function actionId(formId: string): Promise<string> {
  const html = await (await fetch(`${baseUrl}/spike-e07`)).text();
  const start = html.indexOf(`id="${formId}"`);
  const match = /name="\$ACTION_ID_([0-9a-f]+)"/.exec(html.slice(start));
  if (start < 0 || !match) throw new Error(`No action id for ${formId}`);
  return match[1]!;
}

async function postAction(formId: string, fields: Record<string, string>, cookie = "") {
  const form = new FormData();
  form.set(`$ACTION_ID_${await actionId(formId)}`, "");
  for (const [name, value] of Object.entries(fields)) form.set(name, value);
  return fetch(`${baseUrl}/spike-e07`, {
    method: "POST",
    headers: { origin: baseUrl, ...(cookie && { cookie }) },
    body: form,
    redirect: "manual",
  });
}

/** Merges Set-Cookie into a Cookie header (expired cookies removed). */
function applySetCookie(cookie: string, response: Response): string {
  const jar = new Map(
    cookie
      .split("; ")
      .filter(Boolean)
      .map((pair) => [pair.slice(0, pair.indexOf("=")), pair.slice(pair.indexOf("=") + 1)]),
  );
  for (const line of response.headers.getSetCookie()) {
    const [pair] = line.split(";");
    const name = pair!.slice(0, pair!.indexOf("="));
    if (/max-age=0/i.test(line) || /=;/.test(`${pair};`)) jar.delete(name);
    else jar.set(name, pair!.slice(pair!.indexOf("=") + 1));
  }
  return [...jar].map(([k, v]) => `${k}=${v}`).join("; ");
}

const panel = (html: string, where: string) =>
  /(?:layout|page|other): customer=[^ <]+ owner=[^ <"]+/g
    .exec(html.slice(html.indexOf(`${where}: customer=`)))?.[0] ?? `${where}: <missing>`;

let cookieA = "";
let cookieB = "";

describe("E07 spike in next start", () => {
  beforeAll(async () => {
    await db.connect();
    cookieA = await customerSignUp(A);
    cookieB = await customerSignUp(B);
  });

  afterAll(async () => {
    await db.end();
    mkdirSync("packages/app/spike", { recursive: true });
    writeFileSync("packages/app/spike/results-e2e.json", JSON.stringify(results, null, 2));
  });

  it("(h) the route allowlist answers 404 for every path but the four, parameterised ones included", async () => {
    const probe = async (method: string, path: string) =>
      (
        await fetch(`${baseUrl}/api/customer-auth${path}`, {
          method,
          headers: { "content-type": "application/json", origin: baseUrl, cookie: cookieA },
          ...(method === "POST" && { body: JSON.stringify({ role: "owner", name: "x" }) }),
        })
      ).status;
    const statuses: Record<string, number> = {};
    for (const [method, path] of [
      ["POST", "/update-user"],
      ["POST", "/change-email"],
      ["GET", "/list-sessions"],
      ["POST", "/revoke-sessions"],
      ["GET", "/callback/google"],
      ["POST", "/callback/google"],
      ["GET", "/reset-password/abc"],
      ["GET", "/ok"],
      ["GET", "/sign-in/email"],
      ["GET", "/sign-out"],
      ["POST", "/get-session"],
      ["POST", "/update-user/"],
      ["POST", "/UPDATE-USER"],
      ["POST", "//update-user"],
      ["POST", "/%75pdate-user"],
      ["GET", "/get-session"],
    ]) {
      statuses[`${method} ${path}`] = await probe(method, path);
    }
    results.h = statuses;
    const { ["GET /get-session"]: enabled, ...others } = statuses;
    expect(enabled).toBe(200);
    expect(Object.values(others).every((status) => status === 404)).toBe(true);
  });

  it("(d) one server action that signs in through both handlers sends both Set-Cookie headers", async () => {
    const response = await postAction("both", {
      email: A.email,
      password: A.password,
      owner_email: ownerEmail,
      owner_password: ownerPassword,
    });
    const setCookie = response.headers.getSetCookie();
    const cookie = pairs(response);
    results["d.both"] = {
      status: response.status,
      location: response.headers.get("location") ?? response.headers.get("x-action-redirect"),
      setCookie: setCookie.map((line) => line.replace(/=[^;]+/, "=<value>")),
      sessions: await sessions(cookie),
    };
    expect(cookie).toMatch(/commerceos-customer\.session_token=/);
    expect(cookie).toMatch(/better-auth\.session_token=/);
    expect(await sessions(cookie)).toEqual({ customer: A.email, owner: ownerEmail });
  });

  it("(d) a customer sign-in action that also renews a stale owner session sends both cookies", async () => {
    const ownerCookie = await ownerSignIn();
    const token = decodeURIComponent(ownerCookie.split("=")[1]!).split(".")[0];
    await db.query(
      "update admin_sessions set expires_at = now() + interval '7000 seconds' where token = $1",
      [token],
    );
    const response = await postAction(
      "customer-sign-in-renew",
      { email: A.email, password: A.password },
      ownerCookie,
    );
    const renewed = await db.query<{ left: string }>(
      "select extract(epoch from expires_at - now())::int::text as left from admin_sessions where token = $1",
      [token],
    );
    const merged = applySetCookie(ownerCookie, response);
    results["d.renew"] = {
      status: response.status,
      setCookie: response.headers.getSetCookie().map((line) => line.replace(/=[^;]+/, "=<value>")),
      ownerSecondsLeftAfter: renewed.rows[0]?.left,
      sessions: await sessions(merged),
    };
    const names = response.headers.getSetCookie().map((line) => line.split("=")[0]);
    expect(names).toContain("commerceos-customer.session_token");
    expect(names).toContain("better-auth.session_token");
    expect(Number(renewed.rows[0]?.left)).toBeGreaterThan(28_000);
    expect(await sessions(merged)).toEqual({ customer: A.email, owner: ownerEmail });
  });

  it("(d) customer sign-out through auth.api + nextCookies expires only the customer cookie", async () => {
    const both = `${await ownerSignIn()}; ${await customerSignIn(A)}`;
    const response = await postAction("customer-sign-out", {}, both);
    const merged = applySetCookie(both, response);
    results["d.signOut"] = {
      status: response.status,
      setCookie: response.headers.getSetCookie().map((line) => line.replace(/=[^;]*/, "=<value>")),
      after: await sessions(merged),
      oldCookiesAfter: await sessions(both),
    };
    expect(response.headers.getSetCookie().every((line) => line.startsWith("commerceos-customer")))
      .toBe(true);
    expect(await sessions(both)).toEqual({ customer: null, owner: ownerEmail });
  });

  it("(i) request-time session reads are never shared between cookies after a warm-up", async () => {
    const ownerCookie = inject("ownerSessionCookie");
    const cases = [
      { who: "A", cookie: cookieA, expect: `customer=${A.email} owner=none` },
      { who: "B", cookie: cookieB, expect: `customer=${B.email} owner=none` },
      { who: "none", cookie: "", expect: "customer=none owner=none" },
      { who: "owner", cookie: ownerCookie, expect: `customer=none owner=${ownerEmail}` },
    ];
    const seen: string[] = [];
    let leaks = 0;
    for (let round = 0; round < 4; round++) {
      for (const path of ["/spike-e07", "/spike-e07/other"]) {
        for (const c of cases) {
          for (const mode of ["html", "rsc"] as const) {
            const response = await fetch(`${baseUrl}${path}`, {
              headers: {
                ...(c.cookie && { cookie: c.cookie }),
                ...(mode === "rsc" && { rsc: "1" }),
              },
            });
            const body = await response.text();
            const where = path.endsWith("other") ? "other" : "page";
            const ok =
              body.includes(`layout: ${c.expect}`) && body.includes(`${where}: ${c.expect}`);
            const foreign = cases
              .filter((other) => other.who !== c.who)
              .some(
                (other) =>
                  other.expect !== c.expect &&
                  body.includes(`: ${other.expect}`),
              );
            if (!ok || foreign) leaks++;
            if (round === 3) seen.push(`${mode} ${path} ${c.who}: ${panel(body, where)}`);
          }
        }
      }
    }
    // Static shell: the prerendered HTML holds only the fallbacks, never a session.
    const prefetch = await fetch(`${baseUrl}/spike-e07`, {
      headers: { rsc: "1", "next-router-prefetch": "1", cookie: cookieA },
    });
    const prefetchBody = await prefetch.text();
    results.i = {
      requests: 4 * 2 * 4 * 2,
      leaks,
      lastRound: seen,
      prefetchWithCookieA: {
        status: prefetch.status,
        containsAEmail: prefetchBody.includes(A.email),
        containsBEmail: prefetchBody.includes(B.email),
      },
    };
    expect(leaks).toBe(0);
    expect(prefetchBody.includes(B.email)).toBe(false);
  });

  describe("(i, d) one browser context: A signs out, B signs in", () => {
    const browser = useBrowser();

    it("never shows A's state to B, on the page, a client navigation or the layout", async () => {
      const b = browser();
      const steps: Record<string, string> = {};
      const read = async (label: string) => {
        steps[label] = (await b.text("main")) + " | " + (await b.text('[data-panel="layout"]'));
      };
      await b.open("/spike-e07");
      await b.waitForText("page: customer=none");
      await b.fillLabel("Customer email", A.email);
      await b.fillLabel("Customer password", A.password);
      await b.clickRole("button", "Customer sign in");
      await b.waitForText(`page: customer=${A.email}`);
      await read("1 A signed in");
      await b.clickRole("link", "Other page");
      await b.waitForText(`other: customer=${A.email}`);
      await read("2 A other (client nav)");
      await b.clickRole("link", "Spike home");
      await b.waitForText("E07 spike");
      await b.waitForText(`page: customer=${A.email}`);
      await b.clickRole("button", "Customer sign out");
      await b.waitForText("page: customer=none");
      await read("3 A signed out");
      await b.fillLabel("Customer email", B.email);
      await b.fillLabel("Customer password", B.password);
      await b.clickRole("button", "Customer sign in");
      await b.waitForText(`page: customer=${B.email}`);
      await read("4 B signed in");
      await b.clickRole("link", "Other page");
      await b.waitForText(`other: customer=${B.email}`);
      await read("5 B other (client nav)");
      await b.evaluate("history.back()");
      await b.waitForText("E07 spike");
      await read("6 B back button");
      const html = String(await b.evaluate("document.documentElement.outerHTML"));
      results.browser = { steps, aEmailInFinalDom: html.includes(A.email) };
      expect(steps["3 A signed out"]).toContain("layout: customer=none");
      expect(steps["4 B signed in"]).toContain(`layout: customer=${B.email}`);
      expect(steps["5 B other (client nav)"]).not.toContain(A.email);
      expect(steps["6 B back button"]).not.toContain(A.email);
    });
  });
});
