import { beforeAll, describe, expect, it } from "vitest";
import { useBrowser } from "./support/browser-test";
import { resetCopilotQuestionBudget } from "./support/copilot-budget";
import { useOwnerSession } from "./support/sign-in";

const ANSWER = 'main [data-testid="copilot-answer"]';
const SUMMARY = 'main [data-testid="copilot-summary"]';
const SOURCES = "Where does my traffic come from?";
const FUNNEL = "Where in the funnel do visitors drop off?";
const VIEWS = "Which products get views but few sales?";

/**
 * Commerce Copilot, Phase 3: traffic questions (Copilot spec step 15; #28). The e2e app runs
 * without an AI provider, so every answer is rule-based. Data: the demo store seed (E04-S03)
 * writes fictional traffic for the 35 days up to today; Drift Wireless Headset gets many views
 * and few sales. Nothing here buys anything.
 */
describe("admin Copilot: traffic questions (fictional demo data)", () => {
  const browser = useBrowser();

  beforeAll(async () => {
    await resetCopilotQuestionBudget();
    await useOwnerSession(browser());
  });

  /** Opens Copilot, clicks a suggested question and waits for text only its answer has. */
  async function ask(question: string, answerText: string): Promise<string> {
    await browser().open("/admin/copilot");
    await browser().waitForText("Or ask about your store");
    await browser().clickRole("button", question);
    await browser().waitForText(answerText);
    return browser().text(ANSWER);
  }

  async function sessionTotal(): Promise<number> {
    await ask(SOURCES, "Demo sessions in the last 7 days");
    const match = /Demo sessions in the last 7 days: (\d+)\./.exec(await browser().text(SUMMARY));
    return Number(match?.[1]);
  }

  it("answers where traffic comes from, every figure tagged as fictional demo data", async () => {
    const answer = await ask(SOURCES, "Demo sessions in the last 7 days");
    expect(answer).toContain("Rule-based insights · AI is not configured");
    expect(answer).toContain("By source:");
    expect(answer).toContain("Figures in this summary");
    expect(answer).toContain("Fictional demo data");
    expect(answer).toContain("getTrafficSummary · sessionsDemo");
    expect(answer).toContain("fictional demo data: seeded, not measured from real visitors.");
  });

  it("names the funnel step with the largest drop-off, its evidence tagged demo", async () => {
    const answer = await ask(FUNNEL, "The funnel in the last 7 days");
    expect(answer).toContain("Look at the");
    expect(answer).toContain("the largest in the funnel");
    expect(answer).toContain("Fictional demo data");
    expect(answer).toContain("getTrafficSummary · funnelDemo");
    expect(answer).toContain("Paid orders come from the orders table.");
  });

  it("finds the much-viewed, rarely bought Drift Wireless Headset", async () => {
    const answer = await ask(VIEWS, "Most viewed products in the last 7 days");
    expect(answer).toContain("Drift Wireless Headset");
    expect(answer).toContain("Fictional demo data");
    expect(answer).toContain("getTrafficSummary · viewToPurchaseRateDemo");
  });

  it("declines conversion by traffic source and names the missing data", async () => {
    await browser().open("/admin/copilot");
    await browser().waitForText("Or ask about your store");
    await browser().fillLabel(
      "Or ask about your store",
      "What is the conversion rate of social traffic?",
    );
    await browser().clickRole("button", "Ask");
    await browser().waitForText("It needs the traffic source of each order");
    expect(await browser().count('main [data-testid="copilot-recommendation"]')).toBe(0);
  });

  it("reads seeded data only: storefront visits do not change the demo session total", async () => {
    const before = await sessionTotal();
    expect(before).toBeGreaterThan(0);

    const products: { slug: string; name: string }[] = [
      { slug: "drift-wireless-headset", name: "Drift Wireless Headset" },
      { slug: "pulse-ultralight-mouse", name: "Pulse Ultralight Mouse" },
      { slug: "vortex-wireless-mouse", name: "Vortex Wireless Mouse" },
    ];
    for (const { slug, name } of products) {
      await browser().open(`/products/${slug}`);
      await browser().waitForText(name);
    }

    expect(await sessionTotal()).toBe(before);
  });
});
