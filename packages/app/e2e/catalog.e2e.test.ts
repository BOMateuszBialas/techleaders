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
    // "Mice" also appears in the header menu and the footer; click the listing's own link.
    await browser().click('nav[aria-label="Categories"] a[href="/products?category=mice"]');
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

describe("storefront search and category filter (E01-S02)", () => {
  const browser = useBrowser();
  const SEARCH_FORM = 'form[aria-label="Search the catalog"]';

  it("searches from the header and lists only published matches (AC1)", async () => {
    await browser().open("/");
    await browser().waitForText("Shop all products");
    await browser().fillLabel("Search products", "fight");
    await browser().click('form[aria-label="Site search"] button[type="submit"]');
    await browser().waitForUrl("**/products?q=fight");
    await browser().waitForText('Results for "fight" in All products');

    const main = await browser().text("main");
    expect(main).toContain("Arena Fight Stick");
    expect(main).toContain("1 product");
    for (const name of ALL_PUBLISHED.filter((name) => name !== "Arena Fight Stick"))
      expect(main).not.toContain(name);
    // The listing's own form shows the term that was searched.
    expect(await browser().value("#catalog-search-q")).toBe("fight");
  });

  it("combines a search with a category; results satisfy both (AC2)", async () => {
    await browser().open("/products");
    await browser().waitForText("Vortex Wireless Mouse");
    await browser().fillLabel("Search term", "wireless");
    await browser().select("#catalog-search-category", "mice");
    await browser().click(`${SEARCH_FORM} button[type="submit"]`);
    await browser().waitForUrl("**/products?q=wireless&category=mice");
    await browser().waitForText('Results for "wireless" in Mice');

    const main = await browser().text("main");
    expect(main).toContain("Vortex Wireless Mouse");
    for (const other of ["Apex Wireless Controller", "Drift Wireless Headset", "Pulse Ultralight"])
      expect(main).not.toContain(other);
    // The form keeps its values after the submit.
    expect(await browser().value("#catalog-search-q")).toBe("wireless");
    expect(await browser().value("#catalog-search-category")).toBe("mice");

    // The same term in another category matches nothing; "Clear search" keeps the category.
    await browser().open("/products?category=mousepads&q=wireless");
    await browser().waitForText('No products match "wireless" in Mousepads.');
    await browser().clickRole("link", "Clear search");
    await browser().waitForUrl("**/products?category=mousepads");
    await browser().waitForText("Glide XL Mousepad");
  });

  it("keeps the search term when switching category", async () => {
    await browser().open("/products?q=wireless");
    await browser().waitForText("Drift Wireless Headset");
    await browser().click(
      'nav[aria-label="Categories"] a[href="/products?category=headsets&q=wireless"]',
    );
    await browser().waitForUrl("**/products?category=headsets&q=wireless");
    await browser().waitForText('Results for "wireless" in Headsets');
    const main = await browser().text("main");
    expect(main).toContain("Drift Wireless Headset");
    expect(main).not.toContain("Vortex Wireless Mouse");
  });

  it("shows a no-results state and never returns drafts (AC3)", async () => {
    await browser().open("/products?q=zzqx-no-such-product");
    await browser().waitForText('No products match "zzqx-no-such-product".');
    expect(await browser().text("main")).toContain("Clear search");

    // "[E2E] Draft Vortex mouse" matches "Vortex" too, but it is a draft.
    await browser().open("/products?q=Vortex");
    await browser().waitForText("Vortex Wireless Mouse");
    const main = await browser().text("main");
    expect(main).toContain("1 product");
    expect(main).not.toContain("Draft Vortex");
  });

  it("matches LIKE wildcards literally", async () => {
    await browser().open("/products?q=%25");
    await browser().waitForText('No products match "%".');
  });

  it("refuses a search term over 100 characters without listing products", async () => {
    await browser().open(`/products?q=${"a".repeat(101)}`);
    await browser().waitForText("Use at most 100 characters in a search.");
    const main = await browser().text("main");
    expect(main).not.toContain("Vortex Wireless Mouse");
    expect(main).not.toContain("does not exist");
  });
});
