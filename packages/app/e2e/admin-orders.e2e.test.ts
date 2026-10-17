import { describe, expect, it } from "vitest";
import { useBrowser } from "./support/browser-test";
import { signInAsOwner } from "./support/sign-in";

const REFERENCE = /CO-[0-9A-HJKMNP-TV-Z]{5}(-[0-9A-HJKMNP-TV-Z]{5}){3}/;
const ORDER_PAGE = /^\/admin\/orders\/[0-9a-f-]{36}$/;
const ORDERS_TABLE = "main table";
const PRODUCT = "Retro Wired Controller"; // 99,00 zł, 40 in stock; no other suite counts on it

/**
 * Admin orders (orders spec, Phase 1, E04-S01 #22): orders placed through the storefront show
 * up newest first; the detail shows snapshots, totals, the customer and the payment; the status
 * moves through the transition table; cancelling an unpaid order returns its stock.
 *
 * One browser for the file. The owner signs in once (the e2e sign-in rate limit is shared by
 * the run) and the later tests keep that session; the shopper's cart cookie lives beside it.
 */
describe("admin orders (E04-S01)", () => {
  const browser = useBrowser();

  /** The stock the owner sees for the product ("Current stock: N"). */
  async function adminStock(): Promise<number> {
    await browser().open("/admin/products");
    await browser().waitForText(PRODUCT);
    await browser().clickRole("link", PRODUCT);
    await browser().waitForText("Stock history");
    const match = /Current stock: (\d+)/.exec(await browser().text("main"));
    return Number(match?.[1]);
  }

  /** Places an order for `quantity` controllers as a guest; returns its reference (pay page). */
  async function placeOrder(quantity: number): Promise<string> {
    await browser().open("/products/retro-wired-controller");
    await browser().waitForText(PRODUCT);
    await browser().fillLabel("Quantity", String(quantity));
    await browser().clickRole("button", "Add to cart");
    await browser().waitForText("Added to cart.");
    await browser().open("/cart");
    await browser().waitForText("Prices are confirmed at checkout.");
    await browser().clickRole("link", "Checkout");
    await browser().waitForText("Place order");
    await browser().fillLabel("Full name", "Margaret Hamilton");
    await browser().fillLabel("Email", "margaret@example.test");
    await browser().fillLabel("Address", "ul. Piotrkowska 10");
    await browser().fillLabel("City", "Łódź");
    await browser().fillLabel("Postal code", "90-001");
    await browser().clickRole("button", "Place order");
    await browser().waitForText("Confirm demo payment (no charge)");
    return REFERENCE.exec(await browser().text("main"))?.[0] ?? "";
  }

  /** Opens the newest order from the list and checks it is `reference`. */
  async function openNewestOrder(reference: string) {
    await browser().open("/admin/orders");
    await browser().waitForText(reference);
    const table = await browser().text(ORDERS_TABLE);
    // Newest first: this order is the first reference in the table.
    expect(REFERENCE.exec(table)?.[0]).toBe(reference);
    await browser().clickRole("link", reference);
    await browser().waitForText("Change status");
    expect(new URL(await browser().url()).pathname).toMatch(ORDER_PAGE);
  }

  it("redirects /admin/orders to the sign-in page without a session", async () => {
    await browser().clearCookies();
    await browser().open("/admin/orders");
    await browser().waitForUrl("**/admin/sign-in");
  });

  it("lists a paid order first and walks it paid → processing → shipped", async () => {
    await signInAsOwner(browser());
    await browser().waitForText("Signed in as");
    expect(await browser().text('nav[aria-label="Admin"]')).toContain("Orders");

    const reference = await placeOrder(2);
    expect(reference).toMatch(REFERENCE);
    await browser().clickRole("button", "Confirm demo payment (no charge)");
    await browser().waitForText("Thank you — demo payment received");

    await browser().open("/admin/orders");
    await browser().waitForText(reference);
    const list = await browser().text(ORDERS_TABLE);
    expect(list).toContain("Reference");
    expect(list).toContain("Paid");
    expect(list).toMatch(/198,00\s*zł/);
    // A date and time sit in the row.
    expect(list).toMatch(/\d{1,2}:\d{2}/);

    await openNewestOrder(reference);
    let main = await browser().text("main");
    expect(main).toContain(reference);
    expect(main).toContain(PRODUCT);
    expect(main).toContain("DEMO-CON-002");
    expect(main).toMatch(/99,00\s*zł/);
    expect(await browser().text('[data-testid="order-total"]')).toMatch(/198,00\s*zł/);
    expect(main).toContain("free (demo store)");
    expect(main).toContain("Margaret Hamilton");
    expect(main).toContain("margaret@example.test");
    expect(main).toContain("ul. Piotrkowska 10");
    expect(main).toContain("90-001 Łódź");
    expect(main).toContain("Demo payment (no money charged)");
    expect(main).not.toContain("Seeded demo order");
    // A paid order cannot be cancelled, only refunded (A4).
    expect(main).not.toContain("Cancel order");
    expect(main).toContain("Mark as refunded (record only)");

    await browser().clickRole("button", "Mark as processing");
    await browser().waitForText("Order marked as processing.");
    await browser().waitForText("Mark as shipped");
    await browser().clickRole("button", "Mark as shipped");
    await browser().waitForText("Order marked as shipped.");

    // A shipped order offers only the record-only refund.
    await browser().open(new URL(await browser().url()).pathname);
    await browser().waitForText("Change status");
    main = await browser().text("main");
    expect(main).toContain("Shipped");
    expect(main).toContain("Mark as refunded (record only)");
    expect(main).not.toContain("Mark as processing");
    expect(main).not.toContain("Mark as shipped");
    expect(main).not.toContain("Cancel order");
  });

  it("cancels an unpaid order and returns its stock", async () => {
    // Keeps the owner session of the previous test.
    const before = await adminStock();
    expect(await browser().text("main")).toContain("Manual stock changes, newest first");

    const reference = await placeOrder(1);
    expect(await adminStock()).toBe(before - 1);

    await openNewestOrder(reference);
    const main = await browser().text("main");
    expect(main).toContain("Awaiting payment");
    expect(main).toContain("Not paid");
    expect(main).not.toContain("Mark as refunded");

    await browser().click("#confirm-cancelled");
    await browser().clickRole("button", "Cancel order");
    await browser().waitForText("Order cancelled. Stock was returned for 1 item.");
    await browser().waitForText("No further status changes.");

    expect(await adminStock()).toBe(before);
  });
});
