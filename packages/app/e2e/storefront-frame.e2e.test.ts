import { describe, expect, it } from "vitest";
import { useBrowser } from "./support/browser-test";

const THEME_KEY = "commerceos-theme";

/**
 * The lightness of a computed colour on a 0-100 scale. Chrome reports the design tokens (oklch)
 * as `lab(L a b)` and plain colours as `rgb(r, g, b)`; a dark colour has a small value.
 */
function lightness(color: string): number {
  const numbers = (color.match(/-?\d+(\.\d+)?/g) ?? []).map(Number);
  if (color.startsWith("lab(")) return numbers[0] ?? Number.NaN;
  if (color.startsWith("rgb(")) return (Math.max(...numbers.slice(0, 3)) / 255) * 100;
  throw new Error(`unsupported colour: ${color}`);
}

describe("storefront frame (owner decision 2026-11-06)", () => {
  const browser = useBrowser();

  it("keeps the header and the footer dark in the light theme, on a light page body", async () => {
    await browser().open("/");
    await browser().evaluate(`localStorage.setItem("${THEME_KEY}", "light"), true`);
    try {
      // The theme init script reads the stored choice on load, so the page is opened again.
      await browser().open("/");
      await browser().waitForText("Vortex Wireless Mouse");

      const header = await browser().evaluate(
        `getComputedStyle(document.querySelector("header")).backgroundColor`,
      );
      const footer = await browser().evaluate(
        `getComputedStyle(document.querySelector("footer")).backgroundColor`,
      );
      const body = await browser().evaluate(`getComputedStyle(document.body).backgroundColor`);

      expect(lightness(String(header))).toBeLessThan(20);
      expect(lightness(String(footer))).toBeLessThan(20);
      expect(lightness(String(body))).toBeGreaterThan(80);
    } finally {
      await browser().evaluate(`localStorage.removeItem("${THEME_KEY}"), true`);
    }
  });
});
