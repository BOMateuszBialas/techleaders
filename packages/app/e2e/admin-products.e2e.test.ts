import { beforeEach, describe, expect, it } from "vitest";
import { useBrowser } from "./support/browser-test";
import { signInAsOwner } from "./support/sign-in";

const SLIDER = 'ul[aria-label="Featured products"]';
const PRODUCT_PAGE = /^\/admin\/products\/[0-9a-f-]{36}$/;

/**
 * Admin product management (admin catalog spec, Phase 1b). Products this file creates have
 * no category and end as drafts, so the storefront suites and the category counts keep
 * seeing the seeded catalog.
 */
describe("admin products", () => {
  const browser = useBrowser();

  beforeEach(async () => {
    await browser().clearCookies();
  });

  async function signIn() {
    await signInAsOwner(browser());
    await browser().waitForText("Signed in as");
  }

  /** Opens the new-product form and waits for its streamed part. */
  async function openNewProductForm() {
    await browser().open("/admin/products/new");
    await browser().waitForText("Featured on home page");
  }

  async function openProduct(path: string) {
    await browser().open(path);
    await browser().waitForText("Store visibility");
  }

  it("redirects to the sign-in page without a session", async () => {
    await browser().open("/admin/products");
    await browser().waitForUrl("**/admin/sign-in");

    expect(await browser().text("main")).not.toContain("Vortex Wireless Mouse");
  });

  it("lists every product by name with availability and Featured badges", async () => {
    await signIn();
    await browser().clickRole("link", "Products");
    await browser().waitForText("Titan MMO Mouse");

    expect(new URL(await browser().url()).pathname).toBe("/admin/products");
    expect(await browser().title()).toBe("Products · CommerceOS");
    const table = await browser().text('table[aria-label="Products"]');
    // Sorted by name (spec G7); these names do not differ in case (see lessons).
    expect(table.indexOf("Apex Wireless Controller")).toBeLessThan(table.indexOf("Glide XL"));
    expect(table.indexOf("Glide XL")).toBeLessThan(table.indexOf("Vortex Wireless Mouse"));
    expect(table).toMatch(/Titan MMO Mouse\s*DEMO-MOU-003[\s\S]*?Out of stock\s*Featured/);
    expect(table).toMatch(/Pulse Ultralight Mouse\s*DEMO-MOU-002[\s\S]*?Available/);
    expect(table).toMatch(/\[E2E\] Draft keyboard\s*E2E-DRAFT-001[\s\S]*?Hidden\s*Featured/);
  });

  it("creates a draft, features it, publishes it to the home page, then hides it again", async () => {
    await signIn();
    await openNewProductForm();
    await browser().fillLabel("Name", "[E2E] Phantom Pro Mouse");
    await browser().fillLabel("Price (PLN)", "199,90");
    await browser().fillLabel("SKU", "e2e-pha-001");
    await browser().fillLabel("Stock quantity", "5");
    await browser().clickRole("button", "Create product");
    await browser().waitForText("Product created.");

    const productUrl = new URL(await browser().url()).pathname;
    expect(productUrl).toMatch(PRODUCT_PAGE);
    expect(await browser().text("main")).toContain("Hidden: shoppers cannot see or buy it.");
    expect(await browser().value("#product-slug")).toBe("e2e-phantom-pro-mouse");
    expect(await browser().value("#product-sku")).toBe("E2E-PHA-001");
    expect(await browser().value("#product-price")).toBe("199.90");
    // Spec A14: stock is set on create only; the edit form shows it read-only.
    expect(await browser().text("main")).toContain("Stock: 5");

    // A featured draft says it will not show until it is published.
    await browser().click("#product-featured");
    await browser().clickRole("button", "Save changes");
    await browser().waitForText(
      "It is featured, but it will not show in the home page slider until it is published.",
    );

    // The publish button states its outcome before the click (G11).
    expect(await browser().text("#publish-help")).toBe(
      "Publish: shoppers will see it at /products/e2e-phantom-pro-mouse.",
    );
    await browser().clickRole("button", "Publish");
    await browser().waitForText(
      "Published. Visible in the store and can be bought. Shoppers find it at /products/e2e-phantom-pro-mouse.",
    );
    expect(await browser().text("main")).toContain("Available");
    // The details form's message written for the draft does not outlive the publish click.
    expect(await browser().text("main")).not.toContain("until it is published");

    await browser().open("/");
    await browser().waitForText("Vortex Wireless Mouse");
    expect(await browser().text(SLIDER)).toContain("[E2E] Phantom Pro Mouse");

    // Untick Featured: the product leaves the home page slider.
    await openProduct(productUrl);
    await browser().click("#product-featured");
    await browser().clickRole("button", "Save changes");
    await browser().waitForText("Saved. Visible in the store and can be bought.");
    await browser().open("/");
    await browser().waitForText("Vortex Wireless Mouse");
    expect(await browser().text(SLIDER)).not.toContain("Phantom");

    await openProduct(productUrl);
    expect(await browser().text("#publish-help")).toBe(
      "Unpublish: shoppers will no longer see or buy it. Existing orders are not affected.",
    );
    await browser().clickRole("button", "Unpublish");
    await browser().waitForText("Unpublished. Hidden: shoppers cannot see or buy it.");
  });

  it("creates a published product with stock 0, shown as out of stock", async () => {
    await signIn();
    await openNewProductForm();
    await browser().fillLabel("Name", "[E2E] Ghost Keyboard");
    await browser().fillLabel("Price (PLN)", "99");
    await browser().fillLabel("Stock quantity", "0");
    await browser().select("#product-status", "published");
    await browser().clickRole("button", "Create product");
    await browser().waitForText("Product created.");

    const productUrl = new URL(await browser().url()).pathname;
    const main = await browser().text("main");
    expect(main).toContain("Out of stock");
    expect(main).toContain("Visible in the store, shown as out of stock.");

    await browser().open("/products/e2e-ghost-keyboard");
    await browser().waitForText("[E2E] Ghost Keyboard");
    expect(await browser().text("main")).toContain("Out of stock");

    // Clean up: back to a draft, so the storefront suites see the seeded catalog only.
    await openProduct(productUrl);
    await browser().clickRole("button", "Unpublish");
    await browser().waitForText("Unpublished. Hidden: shoppers cannot see or buy it.");
  });

  it("refuses a duplicate SKU under the field and keeps the typed values", async () => {
    await signIn();
    await openNewProductForm();
    await browser().fillLabel("Name", "[E2E] Copy mouse");
    await browser().fillLabel("Price (PLN)", "10");
    // Upper-cased before saving (A11), so it collides with the seeded DEMO-MOU-001.
    await browser().fillLabel("SKU", "demo-mou-001");
    await browser().fillLabel("Stock quantity", "1");
    await browser().clickRole("button", "Create product");
    await browser().waitForText("This SKU is already used by another product.");

    expect(new URL(await browser().url()).pathname).toBe("/admin/products/new");
    expect(await browser().value("#product-name")).toBe("[E2E] Copy mouse");
    expect(await browser().value("#product-sku")).toBe("demo-mou-001");
    expect(await browser().value("#product-price")).toBe("10");
  });

  it("opens a product from its category page", async () => {
    await signIn();
    await browser().open("/admin/categories");
    await browser().waitForText("Mousepads");
    await browser().clickRole("link", "Mousepads");
    await browser().waitForText("Used by 3 products");
    await browser().clickRole("link", "Glide XL Mousepad");
    await browser().waitForText("Store visibility");

    expect(new URL(await browser().url()).pathname).toMatch(PRODUCT_PAGE);
    expect(await browser().text("h1")).toBe("Glide XL Mousepad");
    expect(await browser().value("#product-sku")).toBe("DEMO-PAD-001");
  });

  it("shows the admin not-found page for an unknown or malformed id", async () => {
    await signIn();
    await browser().open("/admin/products/not-a-uuid");
    await browser().waitForText("This record does not exist or was deleted.");
  });
});
