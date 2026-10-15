import { describe, expect, it } from "vitest";
import { getAvailability, isLowStock, isPurchasable, isValidSlug, slugify } from "./product";

describe("product rules", () => {
  it("is purchasable only when published and in stock", () => {
    expect(isPurchasable({ status: "published", stockQuantity: 1 })).toBe(true);
    expect(isPurchasable({ status: "published", stockQuantity: 0 })).toBe(false);
    expect(isPurchasable({ status: "draft", stockQuantity: 10 })).toBe(false);
  });

  it("flags low stock only for published products at or below the threshold", () => {
    expect(isLowStock({ status: "published", stockQuantity: 5 }, 5)).toBe(true);
    expect(isLowStock({ status: "published", stockQuantity: 6 }, 5)).toBe(false);
    expect(isLowStock({ status: "draft", stockQuantity: 0 }, 5)).toBe(false);
  });

  it("reports availability without exposing quantities", () => {
    expect(getAvailability({ status: "published", stockQuantity: 7 })).toBe("in_stock");
    expect(getAvailability({ status: "published", stockQuantity: 0 })).toBe("out_of_stock");
    // Drafts never reach shoppers, but the rule stays total for admin reuse.
    expect(getAvailability({ status: "draft", stockQuantity: 7 })).toBe("out_of_stock");
  });
});

describe("slug rule", () => {
  it.each([
    ["Gaming Mice", "gaming-mice"],
    ["Myszki bezprzewodowe żółte", "myszki-bezprzewodowe-zolte"],
    ["Słuchawki & Głośniki", "sluchawki-glosniki"],
    ["ŁAD", "lad"],
    ["  --Mice---  Pads-- ", "mice-pads"],
    ["Keyboards 60%", "keyboards-60"],
    ["!!! ???", ""],
  ])("slugifies %j to %j", (name, slug) => {
    expect(slugify(name)).toBe(slug);
  });

  it("accepts lowercase words joined by single hyphens only", () => {
    expect(isValidSlug("gaming-mice")).toBe(true);
    expect(isValidSlug("mice2")).toBe(true);
    for (const slug of [
      "",
      "Mice",
      "gaming--mice",
      "-mice",
      "mice-",
      "mice pads",
      "myszki-żółte",
    ]) {
      expect(isValidSlug(slug)).toBe(false);
    }
  });
});
