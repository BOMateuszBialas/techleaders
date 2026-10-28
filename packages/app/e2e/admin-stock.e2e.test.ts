import { beforeEach, describe, expect, inject, it } from "vitest";
import { BrowserSession } from "./support/agent-browser";
import { useBrowser } from "./support/browser-test";
import { signInAsOwner } from "./support/sign-in";

const PRODUCT_PAGE = /^\/admin\/products\/[0-9a-f-]{36}$/;
const HISTORY = 'table[aria-label="Stock history"]';

/**
 * Manual stock adjustment (admin catalog spec, Phase 2, E03-S03). The product this file
 * creates has no category and ends as a draft, so the storefront suites and the category
 * counts keep seeing the seeded catalog.
 */
describe("admin stock adjustment", () => {
  // One browser session for the whole file, so the last block can keep the owner session.
  const browser = useBrowser();

  describe("with a fresh session per test", () => {
    beforeEach(async () => {
      await browser().clearCookies();
    });

    async function signIn() {
      await signInAsOwner(browser());
      await browser().waitForText("Signed in as");
    }

    async function openProduct(path: string) {
      await browser().open(path);
      await browser().waitForText("Stock history");
    }

    it("redirects a product page to the sign-in page without a session", async () => {
      await signIn();
      await browser().open("/admin/categories");
      await browser().waitForText("Mousepads");
      await browser().clickRole("link", "Mousepads");
      await browser().waitForText("Used by 3 products");
      await browser().clickRole("link", "Glide XL Mousepad");
      await browser().waitForText("Stock history");
      const productUrl = new URL(await browser().url()).pathname;
      expect(productUrl).toMatch(PRODUCT_PAGE);

      await browser().clearCookies();
      await browser().open(productUrl);
      await browser().waitForUrl("**/admin/sign-in");
      expect(await browser().text("main")).not.toContain("Stock history");
    });

    it("sets stock 8 → 0, records it, and the store shows the product as out of stock", async () => {
      await signIn();
      await browser().open("/admin/products/new");
      await browser().waitForText("Featured on home page");
      await browser().fillLabel("Name", "[E2E] Stock Test Pad");
      await browser().fillLabel("Price (PLN)", "49,90");
      await browser().fillLabel("SKU", "e2e-stk-001");
      await browser().fillLabel("Stock quantity", "8");
      await browser().select("#product-status", "published");
      await browser().clickRole("button", "Create product");
      await browser().waitForText("Product created.");
      const productUrl = new URL(await browser().url()).pathname;
      expect(productUrl).toMatch(PRODUCT_PAGE);

      await openProduct(productUrl);
      let main = await browser().text("main");
      expect(main).toContain("Current stock: 8");
      expect(main).toContain("Available");
      // The initial stock is not a change (spec Data Model).
      expect(main).toContain("No stock changes recorded yet.");
      expect(main).toContain("Initial stock: not recorded.");
      expect(await browser().value("#stock-new-quantity")).toBe("8");

      await browser().fillLabel("New stock quantity", "0");
      await browser().clickRole("button", "Set stock");
      await browser().waitForText(
        "Stock set to 0 (was 8). Visible in the store, shown as out of stock.",
      );
      await browser().waitForText("Current stock: 0");
      main = await browser().text("main");
      expect(main).toContain("Out of stock");
      expect(main).not.toContain("No stock changes recorded yet.");
      const history = await browser().text(HISTORY);
      expect(history).toContain("-8");
      expect(history).toContain("Manual change");
      // A time in the owner's locale sits next to the change.
      expect(history).toMatch(/\d{1,2}:\d{2}/);

      // A negative quantity is refused under the field and nothing changes.
      await browser().fillLabel("New stock quantity", "-1");
      await browser().clickRole("button", "Set stock");
      await browser().waitForText("Enter a whole number from 0 to 1,000,000.");
      expect(await browser().value("#stock-new-quantity")).toBe("-1");
      expect(await browser().text("main")).toContain("Current stock: 0");

      // The storefront uses the same availability rule (spec A7, R05).
      await browser().open("/products/e2e-stock-test-pad");
      await browser().waitForText("[E2E] Stock Test Pad");
      expect(await browser().text("main")).toContain("Out of stock");

      // The history survives a reload.
      await openProduct(productUrl);
      expect(await browser().text(HISTORY)).toContain("-8");

      // Clean up: back to a draft, so the storefront suites see the seeded catalog only.
      await browser().clickRole("button", "Unpublish");
      await browser().waitForText("Unpublished. Hidden: shoppers cannot see or buy it.");
    });
  });

  /**
   * Follow-up from the review of #42 (#43). This block keeps the owner session left by the last
   * test above instead of signing in again (the sign-in rate limit is shared by the e2e run).
   */
  describe("admin stock adjustment: stale page", () => {
    it("refuses a stale change and resets the form to the current stock (#43)", async () => {
      await browser().open("/admin/products/new");
      await browser().waitForText("Featured on home page");
      await browser().fillLabel("Name", "[E2E] Stale Stock Pad");
      await browser().fillLabel("Price (PLN)", "19,90");
      await browser().fillLabel("Stock quantity", "5");
      await browser().clickRole("button", "Create product");
      await browser().waitForText("Product created.");
      const productUrl = new URL(await browser().url()).pathname;
      await browser().open(productUrl);
      await browser().waitForText("Stock history");
      expect(await browser().text("main")).toContain("Current stock: 5");

      // A second browser with the same owner session (another tab, in effect) changes the stock.
      const other = BrowserSession.create(inject("baseUrl"));
      try {
        await other.open("/admin/sign-in");
        await browser().shareCookiesWith(other);
        await other.open(productUrl);
        await other.waitForText("Stock history");
        await other.fillLabel("New stock quantity", "7");
        await other.clickRole("button", "Set stock");
        await other.waitForText("Stock set to 7 (was 5).");
      } finally {
        await other.close();
      }

      // The first page still shows 5; its change is refused and the form resets to 7.
      await browser().fillLabel("New stock quantity", "3");
      await browser().clickRole("button", "Set stock");
      await browser().waitForText(
        "Stock changed to 7 since this page loaded. Check it and try again.",
      );
      expect(await browser().text("main")).toContain("Current stock: 7");
      expect(await browser().value("#stock-new-quantity")).toBe("7");

      // Submitting again from the reset form applies.
      await browser().fillLabel("New stock quantity", "3");
      await browser().clickRole("button", "Set stock");
      await browser().waitForText("Stock set to 3 (was 7).");
    });
  });
});
