import { describe, expect, it } from "vitest";
import {
  BEST_SELLERS_LIMIT,
  BEST_SELLERS_PRESET,
  EXAMPLE_DELIVERY_TEXT,
  HOME_HERO,
  STORE_FEATURES,
  WHY_BUY_HERE,
} from "./storefront-content";

/** Every line of copy on the home page, as one text (A29: no discount or price promise). */
function homeCopy(): string {
  return [
    HOME_HERO.headline,
    HOME_HERO.description,
    HOME_HERO.cta,
    ...STORE_FEATURES.flatMap((feature) => [feature.title, feature.text, feature.label]),
    ...WHY_BUY_HERE.flatMap((item) => [item.title, item.text]),
  ].join("\n");
}

describe("home page content", () => {
  it("uses the owner-approved hero copy, with no demo framing (Q13, Q14, OA-6)", () => {
    expect(HOME_HERO.headline).toBe("Gear for every desk and every match");
    expect(HOME_HERO.description).toBe(
      "Mice, keyboards, headsets and desk gear. Stock is shown on every product.",
    );
    expect(HOME_HERO.cta).toBe("Shop all products");
    expect(homeCopy()).not.toMatch(/demo/i);
  });

  it("states the example delivery as an example, never as a promise (Q7, OA-5, AS-01)", () => {
    expect(EXAMPLE_DELIVERY_TEXT.startsWith("Example policy:")).toBe(true);
    const delivery = WHY_BUY_HERE.find((item) => item.title === "Delivery and returns");
    expect(delivery?.text).toBe(EXAMPLE_DELIVERY_TEXT);
  });

  it("points each store feature at an existing listing filter", () => {
    expect(STORE_FEATURES.map((feature) => feature.href)).toEqual([
      "/products?category=mousepads",
      "/products?category=headsets",
      "/products?category=keyboards",
    ]);
  });

  it("uses the best-seller settings (Q11)", () => {
    expect(BEST_SELLERS_PRESET).toBe("30d");
    expect(BEST_SELLERS_LIMIT).toBe(4);
  });
});
