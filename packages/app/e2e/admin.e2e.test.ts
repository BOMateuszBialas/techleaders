import { describe, expect, it } from "vitest";
import { useBrowser } from "./support/browser-test";

describe("admin panel", () => {
  const browser = useBrowser();

  it("renders the dashboard shell with its navigation", async () => {
    await browser().open("/admin");

    expect(await browser().title()).toBe("Admin · CommerceOS");
    const { refs } = await browser().snapshot();
    const elements = Object.values(refs);
    expect(elements).toContainEqual({ role: "heading", name: "Dashboard" });
    expect(elements).toContainEqual({ role: "navigation", name: "Admin" });
    expect(elements).toContainEqual({ role: "link", name: "View storefront" });
  });

  it("shows the live system status from the ephemeral database", async () => {
    await browser().open("/admin");
    await browser().waitForText("Database");

    const main = await browser().text("main");
    expect(main).toContain("System status");
    expect(main).toMatch(/\bup\b/);
    expect(main).not.toContain("Status unavailable");
  });

  it("does not expose store data while admin authentication is missing", async () => {
    await browser().open("/admin");

    const main = await browser().text("main");
    expect(main).toContain("Admin authentication is not implemented yet");
    expect(main).not.toMatch(/DEMO-|Colombia Huila|zł/);
  });

  it("navigates back to the storefront", async () => {
    await browser().open("/admin");
    await browser().clickRole("link", "View storefront");
    await browser().waitForText("Storefront");

    expect(new URL(await browser().url()).pathname).toBe("/");
  });
});
