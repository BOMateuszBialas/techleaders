import { Client } from "pg";
import { inject } from "vitest";
import "@commerceos/database/testing";
import type { BrowserSession } from "./agent-browser";
import "./provided-context";

/**
 * Starts the sign-in rate limit afresh in the throwaway e2e database. Without a trusted IP
 * header every sign-in of the run shares one limit of 20 per minute (`SIGN_IN_LIMIT`), so
 * suites that sign in often failed at random once the suite grew (see `.ai/lessons.md`). The
 * limiter itself is covered by the auth integration tests; e2e tests exercise the flows behind
 * it. Never used outside the e2e database.
 */
export async function resetSignInRateLimit(): Promise<void> {
  const client = new Client({ connectionString: inject("databaseUrl") });
  await client.connect();
  try {
    await client.query("delete from admin_rate_limits");
  } finally {
    await client.end();
  }
}

/** Signs in through the real form as the owner created for this run. */
export async function signInAsOwner(browser: BrowserSession, password = inject("ownerPassword")) {
  await resetSignInRateLimit();
  await browser.open("/admin/sign-in");
  await browser.fillLabel("Email", inject("ownerEmail"));
  await browser.fillLabel("Password", password);
  await browser.clickRole("button", "Sign in");
}

/** Signs in over HTTP (no browser) and returns the session cookie header. */
export async function sessionCookieForOwner(baseUrl: string): Promise<string> {
  await resetSignInRateLimit();
  const response = await fetch(`${baseUrl}/api/auth/sign-in/email`, {
    method: "POST",
    headers: { "content-type": "application/json", origin: baseUrl },
    body: JSON.stringify({ email: inject("ownerEmail"), password: inject("ownerPassword") }),
  });
  if (!response.ok) throw new Error(`Owner sign-in failed with ${response.status}`);
  return response.headers
    .getSetCookie()
    .map((cookie) => cookie.split(";")[0])
    .join("; ");
}
