import { beforeEach, describe, expect, it } from "vitest";
import { useBrowser } from "./support/browser-test";
import { signInAsOwner } from "./support/sign-in";

/**
 * Admin category management (admin catalog spec, Phase 1a). Every category this file
 * creates is deleted again before the file ends, so the storefront suites keep seeing the
 * seeded navigation.
 */
describe("admin categories", () => {
  const browser = useBrowser();

  beforeEach(async () => {
    await browser().clearCookies();
  });

  async function signIn() {
    await signInAsOwner(browser());
    await browser().waitForText("Signed in as");
  }

  it("redirects to the sign-in page without a session", async () => {
    await browser().open("/admin/categories");
    await browser().waitForUrl("**/admin/sign-in");

    expect(await browser().text("main")).not.toContain("Mousepads");
  });

  it("lists the seeded categories with their product counts", async () => {
    await signIn();
    await browser().clickRole("link", "Categories");
    await browser().waitForText("Mousepads");

    expect(new URL(await browser().url()).pathname).toBe("/admin/categories");
    expect(await browser().title()).toBe("Categories · CommerceOS");
    const main = await browser().text("main");
    expect(main).toContain("Mousepads");
    expect(main).toContain("[E2E] Empty category");
    expect(main).toMatch(/Mice\s*mice\s*4 products/);
  });

  it("refuses a duplicate slug under the field and keeps the typed values", async () => {
    await signIn();
    await browser().open("/admin/categories/new");
    await browser().waitForText("Leave blank to derive it from the name.");
    await browser().fillLabel("Name", "Mice copy");
    await browser().fillLabel("Slug", "mice");
    await browser().clickRole("button", "Create category");
    await browser().waitForText("This slug is already used by another category.");

    expect(new URL(await browser().url()).pathname).toBe("/admin/categories/new");
    expect(await browser().value("#category-name")).toBe("Mice copy");
    expect(await browser().value("#category-slug")).toBe("mice");
  });

  it("refuses to delete a category that products use, with its count and names", async () => {
    await signIn();
    await browser().open("/admin/categories");
    await browser().waitForText("Mousepads");
    await browser().clickRole("link", "Mousepads");
    await browser().waitForText("Used by 3 products");

    expect(await browser().text("section")).toContain("Glide XL Mousepad");
    // G13: the slug of a used category is part of store URLs.
    expect(await browser().text("main")).toContain(
      "Changing the slug changes the store URL; old links stop working.",
    );

    await browser().clickRole("button", "Delete category");
    await browser().waitForText("3 products still use this category.");
    await browser().open("/admin/categories");
    await browser().waitForText("3 products");
    expect(await browser().text("main")).toContain("Mousepads");
  });

  it("creates a category, edits it in place, then deletes it once it is empty", async () => {
    await signIn();
    await browser().open("/admin/categories/new");
    await browser().waitForText("Leave blank to derive it from the name.");
    await browser().fillLabel("Name", "Streaming Gear");
    await browser().clickRole("button", "Create category");
    await browser().waitForText("Category created.");

    // The slug was derived from the name, and the page shows where shoppers find it.
    expect(new URL(await browser().url()).pathname).toMatch(/^\/admin\/categories\/[0-9a-f-]{36}$/);
    expect(await browser().value("#category-slug")).toBe("streaming-gear");
    expect(await browser().text("main")).toContain("/products?category=streaming-gear");
    expect(await browser().text("section")).toContain("No products use this category.");

    await browser().fillLabel("Name", "Streaming");
    await browser().fillLabel("Slug", "streaming");
    await browser().clickRole("button", "Save changes");
    await browser().waitForText(
      "Saved. Shoppers find it at /products?category=streaming; it has no products yet.",
    );
    expect(await browser().text("h1")).toBe("Streaming");

    await browser().clickRole("button", "Delete category");
    await browser().waitForText("Category deleted.");
    expect(new URL(await browser().url()).pathname).toBe("/admin/categories");
    expect(await browser().text("main")).not.toContain("Streaming");
  });

  it("shows the admin not-found page for an unknown or malformed id", async () => {
    await signIn();
    await browser().open("/admin/categories/not-a-uuid");
    await browser().waitForText("This record does not exist or was deleted.");
  });
});
