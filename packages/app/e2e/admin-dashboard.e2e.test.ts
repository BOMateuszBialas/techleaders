import { METRIC_DEFINITIONS, METRIC_IDS, resolvePeriod } from "@commerceos/core";
import { beforeAll, describe, expect, it } from "vitest";
import { useBrowser } from "./support/browser-test";
import { signInAsOwner } from "./support/sign-in";

const card = (id: string) => `main [data-metric="${id}"]`;
const VALUE = '[data-testid="metric-value"]';
const RANGE = 'main [data-testid="period-range"]';

/**
 * The admin dashboard (orders spec, Phase 3, E04-S02 #23). Asserts properties, never seeded
 * numbers: the demo order history (Phase 2) may or may not be in the database, and other suites
 * place orders too. One sign-in for the whole file (Better Auth allows 20 per minute, shared by
 * every suite); the session stays for the storefront purchase. Buys one Retro Wired Controller
 * (40 in stock), which no other suite counts on.
 */
describe("admin dashboard", () => {
  const browser = useBrowser();

  async function openDashboard(path = "/admin") {
    await browser().open(path);
    await browser().waitForText(METRIC_DEFINITIONS.revenue.label);
  }

  async function paidOrders(): Promise<number> {
    return Number(await browser().text(`${card("paidOrders")} ${VALUE}`));
  }

  beforeAll(async () => {
    await browser().clearCookies();
    await signInAsOwner(browser());
    await browser().waitForText("Signed in as");
  });

  it("shows every metric with a value and its definition for the last 7 days (AC1, AC2)", async () => {
    await openDashboard();

    for (const id of METRIC_IDS) {
      const { label, definition } = METRIC_DEFINITIONS[id];
      const text = await browser().text(card(id));
      expect(text).toContain(label);
      expect(text).toContain(definition);
      // Beyond the label and definition, every card shows a figure or its empty state.
      expect(text.replace(label, "").replace(definition, "").trim()).not.toBe("");
    }
    for (const id of ["ordersPlaced", "paidOrders", "lowStock"]) {
      expect(await browser().text(`${card(id)} ${VALUE}`)).toMatch(/^\d+$/);
    }
    expect(await browser().text(`${card("revenue")} ${VALUE}`)).toMatch(/\d,\d{2}\s*zł/);
    expect(await browser().text(`${card("aov")} ${VALUE}`)).toMatch(
      /^(Not enough data|[\d\s]+,\d{2}\s*zł)$/,
    );
    expect(await browser().text(RANGE)).toBe(
      `${resolvePeriod("7d", new Date()).label} (Europe/Warsaw)`,
    );
    expect(await browser().count('main nav[aria-label="Period"] a[aria-current="page"]')).toBe(1);
    expect(await browser().text('main nav[aria-label="Period"] a[aria-current="page"]')).toBe(
      "Last 7 days",
    );
  });

  it('switches to "Last 30 days", which changes the range label', async () => {
    await openDashboard();
    const sevenDays = await browser().text(RANGE);

    await browser().clickRole("link", "Last 30 days");
    await browser().waitForUrl("**/admin?period=30d");
    await browser().waitForText(resolvePeriod("30d", new Date()).label);
    const thirtyDays = await browser().text(RANGE);
    expect(thirtyDays).not.toBe(sevenDays);
    expect(thirtyDays).toBe(`${resolvePeriod("30d", new Date()).label} (Europe/Warsaw)`);
    expect(await browser().text('main nav[aria-label="Period"] a[aria-current="page"]')).toBe(
      "Last 30 days",
    );

    // An unknown period falls back to the last 7 days, never an error page.
    await openDashboard("/admin?period=abc");
    expect(await browser().text(RANGE)).toBe(sevenDays);
  });

  it('counts a storefront order in "Paid orders" once its demo payment is confirmed (AC4)', async () => {
    await openDashboard();
    const before = await paidOrders();

    await browser().open("/products?category=controllers");
    await browser().waitForText("Retro Wired Controller");
    await browser().click('main a[href="/products/retro-wired-controller"]');
    await browser().waitForText("Add to cart");
    await browser().clickRole("button", "Add to cart");
    await browser().waitForText("Added to cart.");
    await browser().open("/cart");
    await browser().waitForText("Prices are confirmed at checkout.");
    await browser().clickRole("link", "Checkout");
    await browser().waitForText("Place order");
    await browser().fillLabel("Full name", "Dashboard Tester");
    await browser().fillLabel("Email", "dashboard@example.test");
    await browser().fillLabel("Address", "ul. Krótka 2");
    await browser().fillLabel("City", "Kraków");
    await browser().fillLabel("Postal code", "30-001");
    await browser().clickRole("button", "Place order");
    await browser().waitForText("Confirm demo payment (no charge)");
    const payPage = new URL(await browser().url()).pathname;

    // Placed but unpaid: not a paid order yet.
    await openDashboard();
    expect(await paidOrders()).toBe(before);

    await browser().open(payPage);
    await browser().waitForText("Confirm demo payment (no charge)");
    await browser().clickRole("button", "Confirm demo payment (no charge)");
    await browser().waitForText("Thank you — demo payment received");

    await openDashboard();
    expect(await paidOrders()).toBe(before + 1);
  });
});
