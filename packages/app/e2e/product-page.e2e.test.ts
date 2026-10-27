import { Pool } from "pg";
import { afterAll, beforeAll, describe, expect, inject, it } from "vitest";
import { z } from "zod";
import { useBrowser } from "./support/browser-test";

/**
 * The product page layout, the gallery, the tabs and the technical data (storefront v2, Phase 3).
 * The seeder does not set technical data or photos for existing rows, so this suite gives a seeded
 * product its technical rows and removes the photo of another one through the throwaway e2e
 * database, and restores both in `afterAll`.
 */

const TECHNICAL_PRODUCT = "vortex-wireless-mouse";
const NO_PHOTO_PRODUCT = "pulse-ultralight-mouse";
const NO_ROWS_PRODUCT = "arena-fight-stick";
const SPECS = [
  { label: "Sensor", value: "Optical, 26,000 DPI" },
  { label: "Connection", value: "2.4 GHz wireless" },
];
const DELIVERY = "Example policy: delivery in 1–3 working days, 14-day returns.";

const layoutSchema = z.object({
  scrollWidth: z.number(),
  innerWidth: z.number(),
  galleryLeft: z.number(),
  galleryTop: z.number(),
  galleryBottom: z.number(),
  infoLeft: z.number(),
  infoTop: z.number(),
});

// Reads the two columns of the product article: the gallery first, the details second.
const LAYOUT_SCRIPT = `(() => {
  const article = document.querySelector("main article");
  const [gallery, info] = [...article.children];
  const g = gallery.getBoundingClientRect();
  const i = info.getBoundingClientRect();
  return {
    scrollWidth: document.documentElement.scrollWidth,
    innerWidth: window.innerWidth,
    galleryLeft: g.left,
    galleryTop: g.top,
    galleryBottom: g.bottom,
    infoLeft: i.left,
    infoTop: i.top,
  };
})()`;

// The tab panels the user sees: rendered, not hidden and not inert. Base UI keeps the panel of the
// tab that was just left mounted until its close completes, so for a moment the old panel is still
// in the DOM next to the new one. `inert` is set on the old panel in the same render that selects
// the new tab, so the panels the user sees are the ones that count.
const VISIBLE_PANELS_SCRIPT = `[...document.querySelectorAll('main [role="tabpanel"]')]
  .filter((panel) => !panel.hidden && !panel.hasAttribute("inert") && panel.getClientRects().length > 0)
  .map((panel) => panel.textContent.trim())`;

async function runOnE2eDatabase<T>(sql: string, params: unknown[] = []): Promise<T[]> {
  const pool = new Pool({ connectionString: inject("databaseUrl") });
  try {
    const result = await pool.query(sql, params);
    return result.rows as T[];
  } finally {
    await pool.end();
  }
}

describe("storefront product page (storefront v2, Phase 3)", () => {
  const browser = useBrowser();
  let originalPhoto: string | null = null;

  beforeAll(async () => {
    const [row] = await runOnE2eDatabase<{ image_url: string | null }>(
      "select image_url from products where slug = $1",
      [NO_PHOTO_PRODUCT],
    );
    originalPhoto = row?.image_url ?? null;
    await runOnE2eDatabase("update products set technical_specs = $1::jsonb where slug = $2", [
      JSON.stringify(SPECS),
      TECHNICAL_PRODUCT,
    ]);
    await runOnE2eDatabase("update products set image_url = null where slug = $1", [
      NO_PHOTO_PRODUCT,
    ]);
  });

  afterAll(async () => {
    await runOnE2eDatabase("update products set technical_specs = '[]'::jsonb where slug = $1", [
      TECHNICAL_PRODUCT,
    ]);
    await runOnE2eDatabase("update products set image_url = $1 where slug = $2", [
      originalPhoto,
      NO_PHOTO_PRODUCT,
    ]);
  });

  async function readLayout() {
    return layoutSchema.parse(await browser().evaluate(LAYOUT_SCRIPT));
  }

  async function visiblePanels(): Promise<string[]> {
    return z.array(z.string()).parse(await browser().evaluate(VISIBLE_PANELS_SCRIPT));
  }

  it("shows the gallery and the details side by side from 1024 px", async () => {
    await browser().setViewport(1280, 800);
    await browser().open(`/products/${TECHNICAL_PRODUCT}`);
    await browser().waitForText("Wireless gaming mouse with a 26,000 DPI");

    const layout = await readLayout();
    expect(layout.infoLeft).toBeGreaterThan(layout.galleryLeft);
    expect(Math.abs(layout.infoTop - layout.galleryTop)).toBeLessThan(2);
    expect(layout.scrollWidth).toBe(layout.innerWidth);
  });

  it("stacks the gallery above the details below 1024 px", async () => {
    await browser().setViewport(390, 844);
    await browser().open(`/products/${TECHNICAL_PRODUCT}`);
    await browser().waitForText("Wireless gaming mouse with a 26,000 DPI");

    const layout = await readLayout();
    expect(layout.infoTop).toBeGreaterThanOrEqual(layout.galleryBottom - 1);
    expect(Math.abs(layout.infoLeft - layout.galleryLeft)).toBeLessThan(2);
    expect(layout.scrollWidth).toBe(layout.innerWidth);
  });

  it("has no sideways scroll at 320 px", async () => {
    await browser().setViewport(320, 640);
    await browser().open(`/products/${TECHNICAL_PRODUCT}`);
    await browser().waitForText("Wireless gaming mouse with a 26,000 DPI");

    const layout = await readLayout();
    expect(layout.scrollWidth).toBe(320);
    expect(layout.innerWidth).toBe(320);
  });

  it("switches tabs by click and by the arrow keys, showing the technical data and the labelled delivery text", async () => {
    await browser().setViewport(1280, 800);
    await browser().open(`/products/${TECHNICAL_PRODUCT}`);
    await browser().waitForText("Wireless gaming mouse with a 26,000 DPI");

    await browser().clickRole("tab", "Technical data");
    await browser().waitForText("Example values for the demo store.");
    const technical = await browser().text("main");
    expect(technical).toContain("Sensor");
    expect(technical).toContain("Optical, 26,000 DPI");

    // The focused tab moves with the arrow key (Base UI), and its panel follows. The old panel can
    // stay mounted for a moment after the new one appears, so poll until only the delivery panel
    // is visible.
    await browser().press("ArrowRight");
    await expect.poll(visiblePanels, { timeout: 5_000 }).toEqual([DELIVERY]);
  });

  it("shows the neutral line for a product without technical rows", async () => {
    await browser().setViewport(1280, 800);
    await browser().open(`/products/${NO_ROWS_PRODUCT}`);
    await browser().waitForText("Arcade fight stick with a ball-top lever");

    await browser().clickRole("tab", "Technical data");
    await browser().waitForText("Technical data is not available for this product yet.");
  });

  it("shows No photo yet for a product without a photo", async () => {
    await browser().setViewport(1280, 800);
    await browser().open(`/products/${NO_PHOTO_PRODUCT}`);
    await browser().waitForText("No photo yet");

    expect(await browser().text("main")).toContain("No photo yet");
  });
});
