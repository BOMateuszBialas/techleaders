import { describe, expect, it } from "vitest";
import { useBrowser } from "./support/browser-test";

const ALL_PUBLISHED = [
  "Apex Wireless Controller",
  "Arena Fight Stick",
  "Aurora Full-Size Keyboard",
  "Control Cloth Mousepad",
  "Drift Wireless Headset",
  "Echo Surround Headset",
  "Glide XL Mousepad",
  "Nimbus Stereo Headset",
  "Nova TKL Mechanical Keyboard",
  "Pulse Ultralight Mouse",
  "Retro Wired Controller",
  "Strike 60 Keyboard",
  "Tempered Glass Mousepad",
  "Titan MMO Mouse",
  "Vortex Wireless Mouse",
];

describe("storefront catalog listing (E01-S01)", () => {
  const browser = useBrowser();

  it("lists published products of both categories with price, category and availability (AC1)", async () => {
    await browser().open("/products");
    await browser().waitForText("Vortex Wireless Mouse");

    expect(await browser().title()).toBe("Products · CommerceOS");
    const main = await browser().text("main");
    for (const name of ALL_PUBLISHED) expect(main).toContain(name);
    expect(main).toMatch(/249,00\s*zł/);
    expect(main).toMatch(/99,00\s*zł/);
    expect(main).toContain("Mice");
    expect(main).toContain("Keyboards");
    expect(main).toContain("In stock");
    expect(main).toContain("Out of stock");
    // Drafts never appear, and stock quantities are never shown.
    expect(main).not.toContain("Draft keyboard");
    expect(main).not.toContain("Draft Vortex");
    expect(main).not.toMatch(/\b25\b/);
    expect(main).not.toMatch(/\b50\b/);

    expect((await browser().snapshot()).snapshot).toContain('image "Vortex Wireless Mouse"');
  });

  it("narrows the listing to one category and marks it as current", async () => {
    await browser().open("/products");
    await browser().waitForText("Vortex Wireless Mouse");
    await browser().clickRole("link", "Mice");
    await browser().waitForUrl("**/products?category=mice");
    await browser().waitForText("Pulse Ultralight Mouse");

    const main = await browser().text("main");
    expect(main).toContain("Titan MMO Mouse");
    expect(main).toContain("Vortex Wireless Mouse");
    expect(main).not.toContain("Nova TKL Mechanical Keyboard");
    expect(main).not.toContain("Glide XL Mousepad");
    expect(main).not.toContain("Draft Vortex");
  });

  it("shows an empty state for an empty category (AC4)", async () => {
    await browser().open("/products?category=e2e-empty");
    await browser().waitForText("No products in [E2E] Empty category yet.");

    expect(await browser().text("main")).toContain("Browse all products");
  });

  it("shows the same empty state for a category holding only drafts (AC4)", async () => {
    await browser().open("/products?category=e2e-drafts-only");
    await browser().waitForText("No products in [E2E] Drafts only yet.");

    expect(await browser().text("main")).not.toContain("Draft keyboard");
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
