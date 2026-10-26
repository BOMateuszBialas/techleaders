import { describe, expect, it } from "vitest";
import {
  BEST_SELLERS_LIMIT,
  BEST_SELLERS_PRESET,
  EXAMPLE_DELIVERY_TEXT,
  HOME_HERO,
  LOW_STOCK_BANNER,
  lowStockText,
  PROMO_BANNERS,
  WHY_BUY_HERE,
} from "./storefront-content";

/** Every line of copy on the home page, as one text (A29: no discount or price promise). */
function homeCopy(): string {
  return [
    HOME_HERO.headline,
    HOME_HERO.description,
    HOME_HERO.cta,
    ...PROMO_BANNERS.flatMap((banner) => [banner.title, banner.text, banner.cta]),
    LOW_STOCK_BANNER.title,
    LOW_STOCK_BANNER.cta,
    lowStockText("Example", 1),
    ...WHY_BUY_HERE.flatMap((item) => [item.title, item.text]),
  ].join("\n");
}

describe("home page content", () => {
  it("uses the owner-approved hero and banner copy, with no demo framing (Q13, Q14, OA-6)", () => {
    expect(HOME_HERO.headline).toBe("Gear for every desk and every match");
    expect(HOME_HERO.description).toBe(
      "Mice, keyboards, headsets and desk gear. Stock is shown on every product.",
    );
    expect(HOME_HERO.cta).toBe("Shop all products");
    expect(PROMO_BANNERS.map((banner) => [banner.title, banner.text])).toEqual([
      ["Build your setup", "Mousepads for every desk setup."],
      ["Audio for calls", "Gaming headsets for PC and consoles."],
    ]);
    expect(homeCopy()).not.toMatch(/demo/i);
  });

  it("promises no discount, sale or price (A29)", () => {
    expect(homeCopy()).not.toMatch(
      /discount|coupon|promo code|% off|\bsale\b|cheap|\bfree\b|save \d|lowest price|best price/i,
    );
  });

  it("labels the delivery text as an example (Q7, OA-5)", () => {
    expect(EXAMPLE_DELIVERY_TEXT).toBe(
      "Example policy: delivery in 1–3 working days, 14-day returns.",
    );
    const delivery = WHY_BUY_HERE.find((item) => item.title === "Delivery and returns");
    expect(delivery?.text).toBe(EXAMPLE_DELIVERY_TEXT);
  });

  it("points each banner's call to action at an existing listing filter", () => {
    expect(PROMO_BANNERS.map((banner) => banner.href)).toEqual([
      "/products?category=mousepads",
      "/products?category=headsets",
    ]);
  });

  it("uses the approved low-stock template and the best-seller settings (OA-11b, Q11)", () => {
    expect(lowStockText("Titan MMO Mouse", 2)).toBe("Titan MMO Mouse: 2 left");
    expect(LOW_STOCK_BANNER).toEqual({ title: "Low stock", cta: "View product" });
    expect(BEST_SELLERS_PRESET).toBe("30d");
    expect(BEST_SELLERS_LIMIT).toBe(3);
  });
});
