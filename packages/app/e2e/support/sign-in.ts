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
 *
 * Budget rule (#62): every suite on this session is the same owner, so they also share the
 * Copilot's per-owner limit of 10 questions per 10 minutes. A Copilot suite calls
 * `resetCopilotQuestionBudget()` (`copilot-budget.ts`) in its `beforeAll` and keeps itself
 * under 10 questions.
 */
export async function useOwnerSession(browser: BrowserSession): Promise<void> {
  await browser.setCookieHeader(inject("ownerSessionCookie"));
}

/**
 * Gives the browser customer A's or B's session from the global setup (E07 step 8), without a
 * new sign-in. It sets only the customer cookie; call `clearCookies()` first for a browser that
 * must hold no other session.
 */
export async function useCustomerSession(browser: BrowserSession, customer: "a" | "b") {
  await browser.setCookieHeader(
    inject(customer === "a" ? "customerASessionCookie" : "customerBSessionCookie"),
  );
}

/** Signs a customer in through the real form on `/account/sign-in`. */
export async function signInAsCustomer(browser: BrowserSession, email: string, password: string) {
  await browser.open("/account/sign-in");
  await browser.fillLabel("Email", email);
  await browser.fillLabel("Password", password);
  await browser.clickRole("button", "Sign in");
}

/** Registers a customer over HTTP (no browser) and returns the `Cookie` header it sets. */
export async function signUpCustomerOverHttp(
  baseUrl: string,
  email: string,
  password: string,
): Promise<string> {
  const response = await fetch(`${baseUrl}/api/customer-auth/sign-up/email`, {
    method: "POST",
    headers: { "content-type": "application/json", origin: baseUrl },
    body: JSON.stringify({ email, password, name: "Customer" }),
  });
  if (!response.ok) throw new Error(`Customer sign-up failed with ${response.status}`);
  return cookieHeaderOf(response);
}

/** The `Cookie` header a browser would send back after this response. */
function cookieHeaderOf(response: Response): string {
  return response.headers
    .getSetCookie()
    .map((cookie) => cookie.split(";")[0])
    .join("; ");
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
  return cookieHeaderOf(response);
}
