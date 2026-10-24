import { randomUUID } from "node:crypto";
import { beforeEach, describe, expect, inject, it } from "vitest";
import { useBrowser } from "./support/browser-test";
import { signInAsCustomer, useOwnerSession } from "./support/sign-in";

const REFERENCE = /CO-[0-9A-HJKMNP-TV-Z]{5}(-[0-9A-HJKMNP-TV-Z]{5}){3}/;
const NOT_FOUND = "No order found with this reference";

type Customer = "a" | "b";
type Placed = { id: string; reference: string; product: string };

/**
 * The A↔B isolation proof of E07 (spec step 13, E07-S04 #95, certificate evidence): customers A
 * and B (from the global setup) each buy one product while signed in, and A never reaches B's
 * order through a page, the API, the public reference pages or the payment action, also after a
 * cache warm-up and a sign-out and sign-in in the same browser (A23). The owner sees each as an
 * "Account order". The tests run in order on one browser session and share the two orders.
 */
describe("customer A never reaches customer B's orders (E07-S04)", () => {
  const browser = useBrowser();
  const baseUrl = inject("baseUrl");
  const email = { a: inject("customerAEmail"), b: inject("customerBEmail") };
  const cookie = { a: inject("customerASessionCookie"), b: inject("customerBSessionCookie") };
  // Different products, so "B's product" is checkable on A's pages (neither is counted elsewhere).
  const product = { a: "nimbus-stereo-headset", b: "control-cloth-mousepad" };
  const productName = { a: "Nimbus Stereo Headset", b: "Control Cloth Mousepad" };
  const placed: Partial<Record<Customer, Placed>> = {};

  const order = (customer: Customer): Placed => {
    const found = placed[customer];
    if (!found) throw new Error(`Customer ${customer} has not bought yet`);
    return found;
  };

  const api = (path: string, customer: Customer | null) =>
    fetch(`${baseUrl}${path}`, { headers: customer ? { cookie: cookie[customer] } : {} });

  async function browseAs(customer: Customer | null) {
    await browser().clearCookies();
    // The setup's session cookie (what useCustomerSession sets), without a new sign-in.
    if (customer) await browser().setCookieHeader(cookie[customer]);
  }

  async function buyAs(customer: Customer): Promise<Placed> {
    await browseAs(customer);
    await browser().open(`/products/${product[customer]}`);
    await browser().waitForText("Add to cart");
    await browser().clickRole("button", "Add to cart");
    await browser().waitForText("Added to cart.");
    await browser().open("/checkout");
    // The mode the order will follow (A24), with the account email prefilled (A16).
    await browser().waitForText(`Buying as ${email[customer]}`);
    expect(await browser().value("#checkout-customerEmail")).toBe(email[customer]);
    await browser().fillLabel("Full name", `Customer ${customer.toUpperCase()}`);
    await browser().fillLabel("Address", "ul. Testowa 1");
    await browser().fillLabel("City", "Kraków");
    await browser().fillLabel("Postal code", "30-001");
    await browser().clickRole("button", "Place order");
    await browser().waitForText("Confirm demo payment (no charge)");
    const reference = REFERENCE.exec(await browser().text("main"))?.[0] ?? "";
    expect(reference).toMatch(REFERENCE);

    const list = await (await api("/api/account/orders", customer)).json();
    const row = list.data.orders.find(
      (entry: { reference: string }) => entry.reference === reference,
    );
    expect(row, "the new order is listed for its customer").toBeTruthy();
    return { id: row.id, reference, product: productName[customer] };
  }

  beforeEach(async () => {
    await browser().clearCookies();
  });

  it("attaches each signed-in purchase to its customer (E07-S02)", async () => {
    placed.a = await buyAs("a");
    placed.b = await buyAs("b");

    await browseAs("a");
    await browser().open("/account/orders");
    await browser().waitForText(order("a").reference);
    const listA = await browser().text("main");
    expect(listA).toContain("Awaiting payment");
    expect(listA).not.toContain(order("b").reference);

    await browser().clickRole("link", order("a").reference);
    await browser().waitForUrl(`**/account/orders/${order("a").id}`);
    await browser().waitForText("Order details");
    expect(await browser().text("main")).toContain(order("a").product);
  });

  it("page: A opening B's order id sees the same 'Order not found' as a random or malformed id", async () => {
    await browseAs("a");
    for (const id of [order("b").id, randomUUID(), "not-a-uuid"]) {
      await browser().open(`/account/orders/${id}`);
      await browser().waitForText("Order not found");
      const main = await browser().text("main");
      expect(main, id).not.toContain(order("b").reference);
      expect(main, id).not.toContain(order("b").product);
    }
  });

  it("API: A's request for B's order is the same 404 body as a random and a malformed id", async () => {
    const bodies: string[] = [];
    for (const id of [order("b").id, randomUUID(), "not-a-uuid"]) {
      const response = await api(`/api/account/orders/${id}`, "a");
      expect(response.status, id).toBe(404);
      bodies.push(await response.text());
    }
    expect(new Set(bodies).size).toBe(1);
    expect(JSON.parse(bodies[0] ?? "")).toEqual({
      ok: false,
      error: { code: "NOT_FOUND", message: "Order not found." },
    });

    const listA = await (await api("/api/account/orders", "a")).json();
    const references = listA.data.orders.map((entry: { reference: string }) => entry.reference);
    expect(references).toContain(order("a").reference);
    expect(references).not.toContain(order("b").reference);

    const own = await api(`/api/account/orders/${order("b").id}`, "b");
    expect(own.status).toBe(200);
    expect(await own.json()).toMatchObject({ data: { reference: order("b").reference } });
    expect((await api("/api/account/orders", null)).status).toBe(401);
  });

  it("public paths: B's reference answers 'not found' to A and to a browser without a session (A2)", async () => {
    for (const viewer of ["a", null] as const) {
      await browseAs(viewer);
      for (const path of [
        `/orders/${order("b").reference}`,
        `/checkout/pay/${order("b").reference}`,
      ]) {
        await browser().open(path);
        await browser().waitForText(NOT_FOUND);
        const main = await browser().text("main");
        expect(main).toContain(
          "Orders placed with an account open only while you are signed in to it.",
        );
        expect(main).not.toContain(order("b").product);
      }
    }
    // Positive control: B opens their own order by reference.
    await browseAs("b");
    await browser().open(`/orders/${order("b").reference}`);
    await browser().waitForText("Order status");
    expect(await browser().text("main")).toContain(order("b").product);
  });

  it("action: A posting B's reference to confirmDemoPayment is 'not found', and B's order stays unpaid", async () => {
    await browseAs("a");
    await browser().open(`/checkout/pay/${order("a").reference}`);
    await browser().waitForText("Confirm demo payment (no charge)");
    await browser().evaluate(
      `document.querySelector('input[name="reference"]').value = ${JSON.stringify(order("b").reference)}`,
    );
    await browser().clickRole("button", "Confirm demo payment (no charge)");
    await browser().waitForText(`${NOT_FOUND}.`);
    expect(await browser().text("main")).not.toContain(order("b").product);

    await browseAs("b");
    await browser().open(`/account/orders/${order("b").id}`);
    await browser().waitForText("Order details");
    expect(await browser().text("main")).toContain("Awaiting payment");
    // A's own order is untouched too.
    const ownA = await (await api(`/api/account/orders/${order("a").id}`, "a")).json();
    expect(ownA.data.status).toBe("pending_payment");
  });

  it("cache: after a warm-up, each customer sees only their own data, in both directions (A23)", async () => {
    const pages = (customer: Customer) => [
      `/orders/${order(customer).reference}`,
      `/checkout/pay/${order(customer).reference}`,
      `/account/orders/${order(customer).id}`,
    ];
    for (const [first, second] of [
      ["a", "b"],
      ["b", "a"],
    ] as const) {
      await browseAs(first);
      await browser().open("/account/orders");
      await browser().waitForText(order(first).reference);
      for (const path of pages(first)) {
        await browser().open(path);
        await browser().waitForText(order(first).reference);
      }
      await browseAs(second);
      await browser().open("/account/orders");
      await browser().waitForText(`Signed in as ${email[second]}`);
      const list = await browser().text("main");
      expect(list).toContain(order(second).reference);
      expect(list).not.toContain(order(first).reference);
      for (const path of pages(first)) {
        await browser().open(path);
        await browser().waitForText(path.startsWith("/account") ? "Order not found" : NOT_FOUND);
        expect(await browser().text("main"), path).not.toContain(order(first).product);
      }
    }
  });

  it("cache: in one browser, A signs out and B signs in; nothing of A remains (A23)", async () => {
    // Fresh sessions through the real form, so signing out never ends the setup's shared ones.
    await browser().clearCookies();
    await signInAsCustomer(browser(), email.a, inject("customerAPassword"));
    await browser().waitForUrl("**/account/orders");
    await browser().waitForText(order("a").reference);
    // The sign-out button of the "My orders" page (the header has its own).
    await browser().click('main form button[type="submit"]');
    await browser().waitForText("Vortex Wireless Mouse");
    expect(new URL(await browser().url()).pathname).toBe("/");

    await signInAsCustomer(browser(), email.b, inject("customerBPassword"));
    await browser().waitForUrl("**/account/orders");
    await browser().waitForText(`Signed in as ${email.b}`);
    const main = await browser().text("main");
    expect(main).toContain(order("b").reference);
    expect(main).not.toContain(order("a").reference);
    expect(await browser().text("body")).not.toContain(email.a);
    await browser().open(`/orders/${order("a").reference}`);
    await browser().waitForText(NOT_FOUND);
    // The setup's session of A still works: only the form's own session was ended.
    expect((await api("/api/account/orders", "a")).status).toBe(200);
  });

  it("owner: sees each order as an 'Account order' with only the order's own snapshot (A18)", async () => {
    await useOwnerSession(browser());
    for (const customer of ["a", "b"] as const) {
      await browser().open(`/admin/orders/${order(customer).id}`);
      await browser().waitForText(order(customer).reference);
      const main = await browser().text("main");
      expect(main).toContain("Account order");
      expect(main).not.toContain("Guest order");
      expect(main).toContain(`Customer ${customer.toUpperCase()}`);
    }
    await browser().open("/admin/orders");
    await browser().waitForText(order("a").reference);
    expect(await browser().text("main")).toContain("Account order");
  });
});
