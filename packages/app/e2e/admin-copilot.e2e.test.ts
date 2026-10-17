import { beforeAll, describe, expect, inject, it } from "vitest";
import { useBrowser } from "./support/browser-test";
import { useOwnerSession } from "./support/sign-in";

const FOCUS = "What should I focus on to improve sales this week?";
const ANSWER = 'main [data-testid="copilot-answer"]';
const SUMMARY = 'main [data-testid="copilot-summary"]';

/**
 * Commerce Copilot, Phase 1 (rule-based, no LLM provider; Copilot spec step 6). The e2e app
 * runs without any provider, so every answer must say AI is not configured.
 *
 * Data: the seed holds no order history, so the suite buys one Arena Fight Stick (2 in stock,
 * which no other suite counts on) and confirms its demo payment. That makes it a best seller
 * of the last 7 days at or below the low-stock threshold, so rule 1 fires deterministically.
 * Pulse Ultralight Mouse is left alone: other suites rely on its 3 units.
 */
describe("admin Copilot", () => {
  const browser = useBrowser();

  describe("signed out", () => {
    beforeAll(async () => {
      await browser().clearCookies();
    });

    it("answers 401 to the API and redirects the page to sign-in", async () => {
      const response = await fetch(new URL("/api/admin/copilot/answers", inject("baseUrl")), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ intent: "focus" }),
      });
      expect(response.status).toBe(401);
      expect(await response.json()).toMatchObject({ ok: false, error: { code: "UNAUTHORIZED" } });

      await browser().open("/admin/copilot");
      await browser().waitForUrl("**/admin/sign-in**");
    });
  });

  describe("signed in", () => {
    beforeAll(async () => {
      await useOwnerSession(browser());
    });

    async function openCopilot() {
      await browser().open("/admin/copilot");
      await browser().waitForText("Or ask about your store");
    }

    it("is linked from the admin navigation and shows the advisory banner", async () => {
      await browser().open("/admin");
      await browser().click('nav[aria-label="Admin"] a[href="/admin/copilot"]');
      await browser().waitForUrl("**/admin/copilot");
      await browser().waitForText("Or ask about your store");
      const main = await browser().text("main");
      expect(main).toContain("Copilot suggests; you decide.");
      expect(main).toContain(FOCUS);
    });

    it("flags a best seller that is low on stock, with evidence, for the primary question", async () => {
      await browser().open("/products/arena-fight-stick");
      await browser().waitForText("Add to cart");
      await browser().clickRole("button", "Add to cart");
      await browser().waitForText("Added to cart.");
      await browser().open("/cart");
      await browser().waitForText("Prices are confirmed at checkout.");
      await browser().clickRole("link", "Checkout");
      await browser().waitForText("Place order");
      await browser().fillLabel("Full name", "Copilot Tester");
      await browser().fillLabel("Email", "copilot@example.test");
      await browser().fillLabel("Address", "ul. Długa 3");
      await browser().fillLabel("City", "Gdańsk");
      await browser().fillLabel("Postal code", "80-001");
      await browser().clickRole("button", "Place order");
      await browser().waitForText("Confirm demo payment (no charge)");
      await browser().clickRole("button", "Confirm demo payment (no charge)");
      await browser().waitForText("Thank you — demo payment received");

      await openCopilot();
      await browser().clickRole("button", FOCUS);
      await browser().waitForText("Rule-based insights · AI is not configured");
      const answer = await browser().text(ANSWER);
      expect(answer).toContain("Restock Arena Fight Stick");
      expect(answer).toContain("High priority");
      expect(answer).toContain("Evidence from this store's data");
      expect(answer).toContain("getTopProducts · topProducts");
      expect(answer).toContain("getLowStockProducts · lowStock");
      expect(answer).toContain("No traffic or conversion data is available yet.");
      expect(answer).toContain("Suggested next step (your decision)");
      expect(await browser().count(`${ANSWER} a[href^="/admin/products/"]`)).toBeGreaterThan(0);
    });

    it("declines a margin question and names the missing cost data", async () => {
      await openCopilot();
      await browser().fillLabel("Or ask about your store", "What is my profit margin per product?");
      await browser().clickRole("button", "Ask");
      await browser().waitForText("It needs product cost data");
      expect(await browser().text(SUMMARY)).toBe(
        "Copilot can't answer this. It needs product cost data, which this store does not record.",
      );
      expect(await browser().count('main [data-testid="copilot-recommendation"]')).toBe(0);
    });

    it("lists the questions it answers for an unsupported question", async () => {
      await openCopilot();
      await browser().fillLabel("Or ask about your store", "Tell me a joke about keyboards");
      await browser().clickRole("button", "Ask");
      await browser().waitForText("Copilot can't answer that question.");
      const answer = await browser().text(ANSWER);
      expect(answer).toContain(FOCUS);
      expect(answer).toContain("Which products get views but few sales?");
    });
  });
});
