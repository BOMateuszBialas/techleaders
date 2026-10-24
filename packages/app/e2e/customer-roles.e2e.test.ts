import { randomUUID } from "node:crypto";
import { beforeEach, describe, expect, inject, it } from "vitest";
import { useBrowser } from "./support/browser-test";
import { useCustomerSession, useOwnerSession } from "./support/sign-in";

/**
 * Role separation (E07 spec step 8, E07-S05 #96 without the admin label): a customer session
 * never reaches admin pages, admin APIs or admin actions, and the owner session never opens the
 * account area. Customers A and B and the owner come from the global setup, so this file spends
 * no sign-in or sign-up.
 */
describe("customer and owner roles (E07-S05)", () => {
  const browser = useBrowser();
  const baseUrl = inject("baseUrl");
  const customerCookie = inject("customerASessionCookie");
  const ownerCookie = inject("ownerSessionCookie");

  beforeEach(async () => {
    await browser().clearCookies();
  });

  it("the setup's customers are distinct customers with their own sessions", async () => {
    for (const [cookie, email] of [
      [customerCookie, inject("customerAEmail")],
      [inject("customerBSessionCookie"), inject("customerBEmail")],
    ] as const) {
      const response = await fetch(`${baseUrl}/api/customer-auth/get-session`, {
        headers: { cookie },
      });
      expect(response.status).toBe(200);
      expect(await response.json()).toMatchObject({ user: { email, role: "customer" } });
    }
  });

  it("a customer session is sent from /admin to the admin sign-in page", async () => {
    await useCustomerSession(browser(), "a");
    await browser().open("/account/orders");
    await browser().waitForText(`Signed in as ${inject("customerAEmail")}`);

    for (const path of ["/admin", "/admin/orders", "/admin/copilot"]) {
      await browser().open(path);
      await browser().waitForUrl("**/admin/sign-in");
    }
    expect(await browser().text("main")).not.toMatch(/Dashboard|System status|DEMO-/);
  });

  it("a customer session gets 401 from the admin API and no owner session", async () => {
    const me = await fetch(`${baseUrl}/api/admin/me`, { headers: { cookie: customerCookie } });
    expect(me.status).toBe(401);
    expect(await me.json()).toMatchObject({ ok: false, error: { code: "UNAUTHORIZED" } });

    const ownerSession = await fetch(`${baseUrl}/api/auth/get-session`, {
      headers: { cookie: customerCookie },
    });
    expect(await ownerSession.json()).toBeNull();
  });

  it("an admin action posted with only a customer session redirects to sign-in and changes nothing", async () => {
    const name = `[E2E] Customer attempt ${randomUUID().slice(0, 8)}`;
    // Load the owner's form, then swap the browser to the customer's cookie only and submit it.
    await useOwnerSession(browser());
    await browser().open("/admin/categories/new");
    await browser().waitForText("Leave blank to derive it from the name.");
    await browser().clearCookies();
    await useCustomerSession(browser(), "a");
    await browser().fillLabel("Name", name);
    await browser().clickRole("button", "Create category");
    await browser().waitForUrl("**/admin/sign-in");

    await browser().clearCookies();
    await useOwnerSession(browser());
    await browser().open("/admin/categories");
    await browser().waitForText("Mousepads");
    expect(await browser().text("main")).not.toContain(name);
  });

  it("the owner session is sent from the account area to the customer sign-in page", async () => {
    await useOwnerSession(browser());
    for (const path of ["/account/orders", "/account"]) {
      await browser().open(path);
      await browser().waitForUrl("**/account/sign-in");
    }
    await browser().waitForText("Sign in to your account");
    // The storefront header offers sign-in: an owner is not a signed-in customer.
    const { refs } = await browser().snapshot();
    expect(Object.values(refs)).not.toContainEqual({ role: "link", name: "My orders" });

    const customerSession = await fetch(`${baseUrl}/api/customer-auth/get-session`, {
      headers: { cookie: ownerCookie },
    });
    expect(await customerSession.json()).toBeNull();

    // The account API (Phase 2b) is closed to the owner session too (step 8).
    for (const path of ["/api/account/orders", `/api/account/orders/${randomUUID()}`]) {
      const response = await fetch(`${baseUrl}${path}`, { headers: { cookie: ownerCookie } });
      expect(response.status, path).toBe(401);
      expect(await response.json()).toMatchObject({ ok: false, error: { code: "UNAUTHORIZED" } });
    }
  });

  it("with both sessions in one browser, each area sees only its own role (A19)", async () => {
    await useOwnerSession(browser());
    await useCustomerSession(browser(), "b");
    await browser().open("/account/orders");
    await browser().waitForText(`Signed in as ${inject("customerBEmail")}`);
    await browser().open("/admin");
    await browser().waitForText(`Signed in as ${inject("ownerEmail")}`);
    expect(await browser().text("main")).not.toContain(inject("customerBEmail"));
  });

  it("the customer auth endpoint answers 404 outside its four allowed paths (A1)", async () => {
    const statuses: Record<string, number> = {};
    for (const [method, path] of [
      ["POST", "/update-user"],
      ["POST", "/change-email"],
      ["GET", "/list-sessions"],
      ["GET", "/callback/credential"],
      ["GET", "/reset-password/some-token"],
      ["GET", "/sign-in/email"],
      ["POST", "/get-session"],
      ["POST", "/UPDATE-USER"],
      ["POST", "/%75pdate-user"],
      ["POST", "/sign-in%2Femail"],
    ] as const) {
      const response = await fetch(`${baseUrl}/api/customer-auth${path}`, {
        method,
        redirect: "manual",
        headers: { cookie: customerCookie, "content-type": "application/json", origin: baseUrl },
        ...(method === "POST" ? { body: JSON.stringify({ role: "owner", name: "x" }) } : {}),
      });
      statuses[`${method} ${path}`] = response.status;
    }
    expect(statuses).toEqual(Object.fromEntries(Object.keys(statuses).map((key) => [key, 404])));

    // A trailing or doubled slash never reaches the route: Next.js answers 308 to the canonical
    // path, which the allowlist then judges like any other request.
    for (const path of ["/update-user/", "//update-user"]) {
      const redirected = await fetch(`${baseUrl}/api/customer-auth${path}`, {
        method: "POST",
        redirect: "manual",
        headers: { cookie: customerCookie, "content-type": "application/json", origin: baseUrl },
        body: JSON.stringify({ role: "owner" }),
      });
      expect(redirected.status, path).toBe(308);
      expect(new URL(redirected.headers.get("location") ?? "", baseUrl).pathname, path).toBe(
        "/api/customer-auth/update-user",
      );
    }
    const session = await fetch(`${baseUrl}/api/customer-auth/get-session`, {
      headers: { cookie: customerCookie },
    });
    expect(await session.json()).toMatchObject({ user: { role: "customer", name: "Customer" } });
  });
});
