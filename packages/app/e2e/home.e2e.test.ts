import { describe, expect, it } from "vitest";
import { useBrowser } from "./support/browser-test";

describe("storefront home page", () => {
  const browser = useBrowser();

  it("renders the storefront shell", async () => {
    await browser().open("/");

    expect(await browser().title()).toBe("CommerceOS");
    const { refs } = await browser().snapshot();
    const elements = Object.values(refs);
    expect(elements).toContainEqual({ role: "heading", name: "Storefront" });
    expect(elements).toContainEqual({ role: "navigation", name: "Main" });
    expect(await browser().text("main")).toContain("The product catalog is not implemented yet");
  });

  it("links to the admin panel", async () => {
    await browser().open("/");
    await browser().clickRole("link", "Admin");
    await browser().waitForUrl("**/admin");

    expect(new URL(await browser().url()).pathname).toBe("/admin");
  });
});
