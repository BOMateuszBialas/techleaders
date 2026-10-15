import { describe, expect, it } from "vitest";
import { useBrowser } from "./support/browser-test";

const ALL_PUBLISHED = [
  "Brazil Santos 1 kg",
  "Colombia Huila 250 g",
  "Ethiopia Yirgacheffe 250 g",
  "Gooseneck Kettle",
  "V60 Dripper",
];

describe("storefront catalog listing (E01-S01)", () => {
  const browser = useBrowser();

  it("lists published products of both categories with price, category and availability (AC1)", async () => {
    await browser().open("/products");
    await browser().waitForText("V60 Dripper");

    expect(await browser().title()).toBe("Products · CommerceOS");
    const main = await browser().text("main");
    for (const name of ALL_PUBLISHED) expect(main).toContain(name);
    expect(main).toMatch(/54,90\s*zł/);
    expect(main).toMatch(/89,00\s*zł/);
    expect(main).toContain("Coffee");
    expect(main).toContain("Brewing gear");
    expect(main).toContain("In stock");
    expect(main).toContain("Out of stock");
    // Drafts never appear, and stock quantities are never shown.
    expect(main).not.toContain("Draft kettle");
    expect(main).not.toContain("Draft Yirgacheffe");
    expect(main).not.toMatch(/\b42\b/);

    expect((await browser().snapshot()).snapshot).toContain('image "V60 Dripper"');
  });

  it("narrows the listing to one category and marks it as current", async () => {
    await browser().open("/products");
    await browser().waitForText("V60 Dripper");
    await browser().clickRole("link", "Coffee");
    await browser().waitForUrl("**/products?category=coffee");
    await browser().waitForText("Brazil Santos 1 kg");

    const main = await browser().text("main");
    expect(main).toContain("Colombia Huila 250 g");
    expect(main).not.toContain("V60 Dripper");
    expect(main).not.toContain("Gooseneck Kettle");
    expect(main).not.toContain("Draft Yirgacheffe");
  });

  it("shows an empty state for an empty category (AC4)", async () => {
    await browser().open("/products?category=e2e-empty");
    await browser().waitForText("No products in [E2E] Empty category yet.");

    expect(await browser().text("main")).toContain("Browse all products");
  });

  it("shows the same empty state for a category holding only drafts (AC4)", async () => {
    await browser().open("/products?category=e2e-drafts-only");
    await browser().waitForText("No products in [E2E] Drafts only yet.");

    expect(await browser().text("main")).not.toContain("Draft kettle");
  });

  it("says that an unknown or malformed category does not exist", async () => {
    for (const path of [
      "/products?category=no-such-category",
      "/products?category=Not%20a%20slug!",
    ]) {
      await browser().open(path);
      await browser().waitForText("This category does not exist.");
      expect(await browser().text("main")).toContain("All products");
    }
  });
});
