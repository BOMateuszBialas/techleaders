import { describe, expect, inject, it } from "vitest";
import { useBrowser } from "./support/browser-test";

const NOINDEX = /<meta name="robots" content="noindex"\s*\/?>/;

describe("storefront product page (E01-S01)", () => {
  const browser = useBrowser();
  const baseUrl = inject("baseUrl");

  it("shows description, price, availability, category and image (AC2)", async () => {
    await browser().open("/products/v60-dripper");
    await browser().waitForText("[DEMO] V60 Dripper");

    expect(await browser().title()).toBe("V60 Dripper · CommerceOS");
    const main = await browser().text("main");
    expect(main).toMatch(/89,00\s*zł/);
    expect(main).toContain("In stock");
    expect(main).toContain("Brewing gear");
    const { refs, snapshot } = await browser().snapshot();
    expect(Object.values(refs)).toContainEqual({ role: "heading", name: "V60 Dripper" });
    expect(snapshot).toContain('image "V60 Dripper"');
  });

  it("shows an out-of-stock product as out of stock", async () => {
    await browser().open("/products/gooseneck-kettle");
    await browser().waitForText("Gooseneck Kettle");

    expect(await browser().text("main")).toContain("Out of stock");
  });

  it("opens a product from the listing", async () => {
    await browser().open("/products");
    await browser().waitForText("Brazil Santos 1 kg");
    await browser().clickRole("link", "Brazil Santos 1 kg");
    await browser().waitForUrl("**/products/brazil-santos-1kg");
    await browser().waitForText("[DEMO] Brazil Santos 1 kg");
  });

  it("treats a draft as not found and never shows it (AC3)", async () => {
    await browser().open("/products/e2e-draft-kettle");
    await browser().waitForText("Product not found");

    expect(await browser().title()).toBe("Product not found · CommerceOS");
    expect(await browser().text("body")).not.toContain("Draft kettle");
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
    const published = await fetch(`${baseUrl}/products/v60-dripper`);
    expect(published.status).toBe(200);
    expect(await published.text()).not.toMatch(NOINDEX);

    for (const slug of ["e2e-draft-kettle", "no-such-product"]) {
      const response = await fetch(`${baseUrl}/products/${slug}`);
      const html = await response.text();
      expect(response.status).toBe(200);
      expect(html).toMatch(NOINDEX);
      expect(html).toContain("Product not found");
      expect(html).not.toContain("Draft kettle");
    }
  });
});
