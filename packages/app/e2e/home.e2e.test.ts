import { describe, expect, inject, it } from "vitest";
import { useBrowser } from "./support/browser-test";

/** Published featured products of the demo seed, sorted by name (spec G9, G16). */
const FEATURED = [
  "Apex Wireless Controller",
  "Echo Surround Headset",
  "Glide XL Mousepad",
  "Nova TKL Mechanical Keyboard",
  "Titan MMO Mouse",
  "Vortex Wireless Mouse",
];
const SLIDER = 'ul[aria-label="Featured products"]';
const DEMO_NOTICE = "Demo store. Products and prices are fictional; no real orders or payments.";

/** Retries `read` until `done` holds, for content that changes after a client navigation. */
async function eventually(
  read: () => Promise<string>,
  done: (text: string) => boolean,
): Promise<string> {
  let text = "";
  for (let attempt = 0; attempt < 50; attempt += 1) {
    text = await read();
    if (done(text)) return text;
    await new Promise((resolve) => setTimeout(resolve, 100));
  }
  throw new Error(`Condition not met; last text: ${text}`);
}

describe("storefront home page (Phase 1b)", () => {
  const browser = useBrowser();
  const baseUrl = inject("baseUrl");

  it("shows the demo banner, the hero, the header menu and the footer", async () => {
    await browser().open("/");
    await browser().waitForText("Vortex Wireless Mouse");

    expect(await browser().title()).toBe("CommerceOS");
    const elements = Object.values((await browser().snapshot()).refs);
    expect(elements).toContainEqual({ role: "heading", name: "Gear up for your next match" });
    expect(elements).toContainEqual({ role: "link", name: "Shop all products" });
    expect(elements).toContainEqual({ role: "navigation", name: "Main" });
    expect(elements).toContainEqual({ role: "link", name: "Shop all" });
    for (const name of ["Mice", "Keyboards", "Headsets", "Controllers", "Mousepads"]) {
      expect(elements).toContainEqual({ role: "link", name });
    }
    expect(elements).toContainEqual({ role: "navigation", name: "Footer categories" });
    expect(elements).toContainEqual({ role: "link", name: "Owner sign-in" });
    // "Admin" moved from the header to "Owner sign-in" in the footer (spec G13, G14).
    expect(elements).not.toContainEqual({ role: "link", name: "Admin" });

    const footer = await browser().text("footer");
    expect(footer).toContain(DEMO_NOTICE);
    expect(footer).toContain("A CommerceOS demo store.");
    expect(await browser().text("body")).toContain(DEMO_NOTICE);
  });

  it("goes to the full listing from the hero's “Shop all products”", async () => {
    await browser().open("/");
    await browser().clickRole("link", "Shop all products");
    await browser().waitForUrl("**/products");

    expect(new URL(await browser().url()).pathname).toBe("/products");
  });

  it("lists published featured products only, with out-of-stock ones labelled", async () => {
    await browser().open("/");
    await browser().waitForText("Vortex Wireless Mouse");

    const slider = await browser().text(SLIDER);
    for (const name of FEATURED) expect(slider).toContain(name);
    expect(slider).toContain("Out of stock");
    expect(slider).not.toContain("Pulse Ultralight Mouse");
    expect(slider).not.toContain("Draft");
    // The "[E2E] Drafts only" tab is a category name; the featured drafts never appear.
    const main = await browser().text("main");
    expect(main).not.toContain("Draft keyboard");
    expect(main).not.toContain("Draft Vortex");

    const html = await (await fetch(`${baseUrl}/`)).text();
    expect(html).toMatch(/aria-current="page"[^>]*>All</);
  });

  it("narrows the slider with a category tab and keeps the category in the URL", async () => {
    await browser().open("/");
    await browser().waitForText("Nova TKL Mechanical Keyboard");
    await browser().click('nav[aria-label="Featured categories"] a[href="/?category=mice"]');
    await browser().waitForUrl("**/?category=mice");

    const slider = await eventually(
      () => browser().text(SLIDER),
      (text) => !text.includes("Nova TKL"),
    );
    expect(slider).toContain("Titan MMO Mouse");
    expect(slider).toContain("Vortex Wireless Mouse");
    expect(slider).not.toContain("Glide XL Mousepad");
    expect(slider).not.toContain("Draft");
    expect(new URL(await browser().url()).searchParams.get("category")).toBe("mice");
  });

  it("says when a category has no featured products and links to its listing", async () => {
    await browser().open("/?category=e2e-empty");
    await browser().waitForText("No featured products in [E2E] Empty category yet.");

    await browser().clickRole("link", "Browse all [E2E] Empty category");
    await browser().waitForUrl("**/products?category=e2e-empty");
  });

  it("shows All for an unknown or malformed category, without an error", async () => {
    for (const path of ["/?category=no-such-category", "/?category=Not%20a%20slug!"]) {
      await browser().open(path);
      await browser().waitForText("Vortex Wireless Mouse");
      const main = await browser().text("main");
      expect(main).toContain("Nova TKL Mechanical Keyboard");
      expect(main).not.toContain("does not exist");
    }
  });

  it("opens the header menu on a narrow screen with a native disclosure", async () => {
    await browser().setViewport(390, 844);
    try {
      await browser().open("/");
      await browser().waitForText("Vortex Wireless Mouse");
      const closed = Object.values((await browser().snapshot()).refs);
      expect(closed).not.toContainEqual({ role: "navigation", name: "Main" });

      await browser().click("header summary");
      const open = Object.values((await browser().snapshot()).refs);
      expect(open).toContainEqual({ role: "navigation", name: "Main" });
      expect(open).toContainEqual({ role: "link", name: "Shop all" });

      await browser().click('header details a[href="/products?category=keyboards"]');
      await browser().waitForUrl("**/products?category=keyboards");
      await browser().waitForText("Strike 60 Keyboard");
    } finally {
      await browser().setViewport(1280, 720);
    }
  });

  it("links to the owner sign-in from the footer", async () => {
    await browser().open("/");
    await browser().clickRole("link", "Owner sign-in");
    await browser().waitForUrl("**/admin/sign-in");

    expect(new URL(await browser().url()).pathname).toBe("/admin/sign-in");
  });
});
