import { describe, expect, inject, it } from "vitest";
import { useBrowser } from "./support/browser-test";

const NOINDEX = /<meta name="robots" content="noindex"\s*\/?>/;

describe("storefront product page (E01-S01)", () => {
  const browser = useBrowser();
  const baseUrl = inject("baseUrl");

  it("shows description, price, availability, category and image (AC2)", async () => {
    await browser().open("/products/vortex-wireless-mouse");
    await browser().waitForText("[DEMO] Wireless gaming mouse");

    expect(await browser().title()).toBe("Vortex Wireless Mouse · CommerceOS");
    const main = await browser().text("main");
    expect(main).toMatch(/249,00\s*zł/);
    expect(main).toContain("In stock");
    expect(main).toContain("Mice");
    const { refs, snapshot } = await browser().snapshot();
    expect(Object.values(refs)).toContainEqual({ role: "heading", name: "Vortex Wireless Mouse" });
    expect(snapshot).toContain('image "Vortex Wireless Mouse"');
  });

  it("shows an out-of-stock product as out of stock", async () => {
    await browser().open("/products/titan-mmo-mouse");
    await browser().waitForText("Titan MMO Mouse");

    expect(await browser().text("main")).toContain("Out of stock");
  });

  it("opens a product from the listing", async () => {
    await browser().open("/products");
    await browser().waitForText("Arena Fight Stick");
    await browser().clickRole("link", "Arena Fight Stick");
    await browser().waitForUrl("**/products/arena-fight-stick");
    await browser().waitForText("[DEMO] Arcade fight stick");
  });

  it("treats a draft as not found and never shows it (AC3)", async () => {
    await browser().open("/products/e2e-draft-keyboard");
    await browser().waitForText("Product not found");

    expect(await browser().title()).toBe("Product not found · CommerceOS");
    expect(await browser().text("body")).not.toContain("Draft keyboard");
  });

  it("shows not found for an unknown or malformed slug", async () => {
    for (const path of ["/products/no-such-product", "/products/Not%20A%20Slug"]) {
      await browser().open(path);
      await browser().waitForText("Product not found");
    }
  });

  // Spec Q4 (confirmed by the product owner): the not-found UI streams after the shell,
  // so the status stays 200 and Next.js adds a noindex robots tag.
  it("answers 200 with noindex for drafts and unknown slugs, and 200 without it for products", async () => {
    const published = await fetch(`${baseUrl}/products/vortex-wireless-mouse`);
    expect(published.status).toBe(200);
    expect(await published.text()).not.toMatch(NOINDEX);

    for (const slug of ["e2e-draft-keyboard", "no-such-product"]) {
      const response = await fetch(`${baseUrl}/products/${slug}`);
      const html = await response.text();
      expect(response.status).toBe(200);
      expect(html).toMatch(NOINDEX);
      expect(html).toContain("Product not found");
      expect(html).not.toContain("Draft keyboard");
    }
  });
});
