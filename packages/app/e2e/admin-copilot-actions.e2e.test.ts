import { beforeAll, describe, expect, it } from "vitest";
import { useBrowser } from "./support/browser-test";
import { resetCopilotQuestionBudget } from "./support/copilot-budget";
import { useOwnerSession } from "./support/sign-in";

const FOCUS = "What should I focus on to improve sales this week?";
const PULSE = "Restock Pulse Ultralight Mouse";
const YOURS = 'main [data-testid="your-recommendations"]';
const YOUR_CARDS = `${YOURS} [data-testid="copilot-recommendation"]`;

/**
 * Commerce Copilot, Phase 4: save, dismiss and complete recommendations (Copilot spec step 18;
 * #26). The e2e app runs without an AI provider, so answers are rule-based; the demo store seed
 * makes rule 1 flag Pulse Ultralight Mouse. The suite asks 3 questions on a fresh budget (#62)
 * and changes nothing in the store.
 */
describe("admin Copilot: recommendation actions", () => {
  const browser = useBrowser();

  beforeAll(async () => {
    await resetCopilotQuestionBudget();
    await useOwnerSession(browser());
  });

  /** Opens Copilot and asks the primary question; resolves once its answer is shown. */
  async function askFocus(): Promise<void> {
    await browser().open("/admin/copilot");
    await browser().waitForText("Your recommendations");
    await browser().clickRole("button", FOCUS);
    await browser().waitForText("Rule-based insights · AI is not configured");
  }

  it("starts with no saved recommendation", async () => {
    await browser().open("/admin/copilot");
    await browser().waitForText("Your recommendations");
    expect(await browser().text(YOURS)).toContain("Saved recommendations appear here.");
  });

  it("saves a recommendation, which then appears under Your recommendations", async () => {
    await askFocus();
    expect(await browser().text('main [data-testid="copilot-answer"]')).toContain("Status: New");
    await browser().clickRole("button", `Save: ${PULSE}`);
    await browser().waitForText("Recommendation saved.");
    // The page refreshes after the action: the list now holds the saved recommendation (only
    // a listed card carries the "Suggested on" date, so this waits for the refresh).
    await browser().waitForText("Suggested on");
    expect(await browser().count(YOUR_CARDS)).toBe(1);
    const saved = await browser().text(YOURS);
    expect(saved).toContain(PULSE);
    expect(saved).toContain("Status: Saved");
    expect(saved).toContain("Suggested on");
    expect(saved).toContain("Evidence from this store's data");
  });

  it("marks it completed, after which no actions remain", async () => {
    await browser().click(`${YOURS} button[value="completed"]`);
    await browser().waitForText("Copilot did not change anything in your store.");
    await browser().waitForText("No further actions.");
    const list = await browser().text(YOURS);
    expect(list).toContain("Status: Completed");
    expect(await browser().count(`${YOURS} button[value]`)).toBe(0);
  });

  it("dismisses a recommendation from a new answer; dismissed ones are not listed", async () => {
    await askFocus();
    await browser().clickRole("button", `Dismiss: ${PULSE}`);
    await browser().waitForText("Recommendation dismissed.");
    expect(await browser().text('main [data-testid="copilot-answer"]')).toContain(
      "Status: Dismissed",
    );
    // Only the completed one from before is listed.
    expect(await browser().count(YOUR_CARDS)).toBe(1);
    expect(await browser().text(YOURS)).toContain("Status: Completed");
  });

  it("sends a signed-out owner to sign-in instead of changing anything", async () => {
    await askFocus();
    await browser().clearCookies();
    await browser().clickRole("button", `Save: ${PULSE}`);
    await browser().waitForUrl("**/admin/sign-in**");
  });
});
