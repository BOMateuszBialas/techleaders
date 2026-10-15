import { beforeEach, describe, expect, inject, it } from "vitest";
import { useBrowser } from "./support/browser-test";
import { sessionCookieForOwner, signInAsOwner } from "./support/sign-in";

describe("admin panel", () => {
  const browser = useBrowser();
  const baseUrl = inject("baseUrl");

  beforeEach(async () => {
    await browser().clearCookies();
  });

  it("redirects to the sign-in page without a session (AC2)", async () => {
    await browser().open("/admin");
    await browser().waitForUrl("**/admin/sign-in");

    expect(await browser().title()).toBe("Sign in · CommerceOS");
    expect(await browser().text("main")).not.toMatch(/System status|DEMO-|zł/);
  });

  it("answers 401 on an admin API without a session and 200 with one (AC2)", async () => {
    const anonymous = await fetch(`${baseUrl}/api/admin/me`);
    expect(anonymous.status).toBe(401);
    expect(await anonymous.json()).toMatchObject({ ok: false, error: { code: "UNAUTHORIZED" } });

    const cookie = await sessionCookieForOwner(baseUrl);
    const signedIn = await fetch(`${baseUrl}/api/admin/me`, { headers: { cookie } });
    expect(signedIn.status).toBe(200);
    expect(await signedIn.json()).toMatchObject({
      ok: true,
      data: { email: inject("ownerEmail"), role: "owner" },
    });
  });

  it("shows a generic error for a wrong password and stays signed out (AC3)", async () => {
    await signInAsOwner(browser(), "definitely-the-wrong-password");
    await browser().waitForText("Invalid email or password.");

    expect(new URL(await browser().url()).searchParams.get("error")).toBe("invalid");
    await browser().open("/admin");
    await browser().waitForUrl("**/admin/sign-in");
  });

  it("signs the owner in and shows the dashboard with live system status (AC1)", async () => {
    await signInAsOwner(browser());
    await browser().waitForText(`Signed in as ${inject("ownerEmail")}`);
    await browser().waitForText("Database");

    expect(await browser().title()).toBe("Admin · CommerceOS");
    const { refs } = await browser().snapshot();
    const elements = Object.values(refs);
    expect(elements).toContainEqual({ role: "heading", name: "Dashboard" });
    expect(elements).toContainEqual({ role: "navigation", name: "Admin" });
    const main = await browser().text("main");
    expect(main).toContain("System status");
    expect(main).toMatch(/\bup\b/);
    expect(main).not.toContain("not implemented yet");
  });

  it("redirects a signed-in owner away from the sign-in page", async () => {
    await signInAsOwner(browser());
    await browser().waitForText("Signed in as");
    await browser().open("/admin/sign-in");
    await browser().waitForUrl("**/admin");

    expect(new URL(await browser().url()).pathname).toBe("/admin");
  });

  it("navigates back to the storefront", async () => {
    await signInAsOwner(browser());
    await browser().waitForText("Signed in as");
    await browser().clickRole("link", "View storefront");
    await browser().waitForText("Shop all products");

    expect(new URL(await browser().url()).pathname).toBe("/");
  });

  it("signs out, after which the admin needs a new sign-in (AC4)", async () => {
    await signInAsOwner(browser());
    await browser().waitForText("Signed in as");
    await browser().clickRole("button", "Sign out");
    await browser().waitForUrl("**/admin/sign-in");

    await browser().open("/admin");
    await browser().waitForUrl("**/admin/sign-in");
    expect(new URL(await browser().url()).pathname).toBe("/admin/sign-in");
  });
});
