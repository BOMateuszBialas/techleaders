import { describe, expect, it } from "vitest";
import { useBrowser } from "./support/browser-test";

describe("storefront home page", () => {
  const browser = useBrowser();

  it("shows the demo banner, the introduction and every category", async () => {
    await browser().open("/");
    await browser().waitForText("Keyboards");

    expect(await browser().title()).toBe("CommerceOS");
    expect(await browser().text("body")).toContain(
      "Demo store. Products and prices are fictional; no real orders or payments.",
    );
    const elements = Object.values((await browser().snapshot()).refs);
    expect(elements).toContainEqual({
      role: "heading",
      name: "Welcome to the CommerceOS demo store",
    });
    expect(elements).toContainEqual({ role: "navigation", name: "Main" });
    expect(elements).toContainEqual({ role: "navigation", name: "Categories" });
    for (const name of ["Mice", "Keyboards", "[E2E] Empty category"]) {
      expect(elements).toContainEqual({ role: "link", name });
    }
  });

  it("goes to the full listing from “Shop all products”", async () => {
    await browser().open("/");
    await browser().clickRole("link", "Shop all products");
    await browser().waitForUrl("**/products");

    expect(new URL(await browser().url()).pathname).toBe("/products");
  });

  it("opens a category listing from the category list", async () => {
    await browser().open("/");
    await browser().waitForText("Keyboards");
    await browser().clickRole("link", "Keyboards");
    await browser().waitForUrl("**/products?category=keyboards");
    await browser().waitForText("Nova TKL Mechanical Keyboard");

    expect(new URL(await browser().url()).searchParams.get("category")).toBe("keyboards");
  });

  it("links to the admin panel, which asks a signed-out visitor to sign in", async () => {
    await browser().open("/");
    await browser().clickRole("link", "Admin");
    await browser().waitForUrl("**/admin/sign-in");

    expect(new URL(await browser().url()).pathname).toBe("/admin/sign-in");
  });
});
