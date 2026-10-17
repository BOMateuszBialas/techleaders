import { inject } from "vitest";
import type { BrowserSession } from "./agent-browser";
import "./provided-context";

/** Signs in through the real form as the owner created for this run. */
export async function signInAsOwner(browser: BrowserSession, password = inject("ownerPassword")) {
  await browser.open("/admin/sign-in");
  await browser.fillLabel("Email", inject("ownerEmail"));
  await browser.fillLabel("Password", password);
  await browser.clickRole("button", "Sign in");
}

/** Signs in over HTTP (no browser) and returns the session cookie header. */
export async function sessionCookieForOwner(baseUrl: string): Promise<string> {
  return signInOverHttp(baseUrl, inject("ownerEmail"), inject("ownerPassword"));
}

/**
 * Gives the browser the owner session the global setup signed in once, instead of a new
 * sign-in: every sign-in of the run counts against the same 20-per-minute limit.
 */
export async function useOwnerSession(browser: BrowserSession): Promise<void> {
  await browser.setCookieHeader(inject("ownerSessionCookie"));
}

/** Posts the sign-in form's JSON to Better Auth and returns the `Cookie` header it sets. */
export async function signInOverHttp(
  baseUrl: string,
  email: string,
  password: string,
): Promise<string> {
  const response = await fetch(`${baseUrl}/api/auth/sign-in/email`, {
    method: "POST",
    headers: { "content-type": "application/json", origin: baseUrl },
    body: JSON.stringify({ email, password }),
  });
  if (!response.ok) throw new Error(`Owner sign-in failed with ${response.status}`);
  return response.headers
    .getSetCookie()
    .map((cookie) => cookie.split(";")[0])
    .join("; ");
}
