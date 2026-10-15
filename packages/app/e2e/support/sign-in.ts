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
