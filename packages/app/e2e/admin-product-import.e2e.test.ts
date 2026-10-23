import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterAll, describe, expect, it } from "vitest";
import { useBrowser } from "./support/browser-test";
import { useOwnerSession } from "./support/sign-in";

const IMPORT_PAGE = "/admin/products/import";
const FILE_INPUT = "#product-import-file";

/**
 * CSV product import (CSV import spec, step 6). The imported products have no category and
 * stay drafts, so the storefront suites and the category counts keep seeing the seeded
 * catalog. Uses the global setup's owner session (no extra sign-in, lesson 2026-10-17).
 */
describe("admin CSV product import", () => {
  const browser = useBrowser();
  const dir = mkdtempSync(join(tmpdir(), "commerceos-import-"));

  afterAll(() => {
    rmSync(dir, { recursive: true, force: true });
  });

  function csvFile(name: string, content: string): string {
    const path = join(dir, name);
    writeFileSync(path, content, "utf8");
    return path;
  }

  async function check(path: string) {
    await browser().open(IMPORT_PAGE);
    await browser().waitForText("Check file");
    await browser().upload(FILE_INPUT, path);
    await browser().clickRole("button", "Check file");
  }

  it("redirects to the sign-in page without a session", async () => {
    await browser().clearCookies();
    await browser().open(IMPORT_PAGE);
    await browser().waitForUrl("**/admin/sign-in");
    expect(await browser().text("main")).not.toContain("Check file");
  });

  it("shows a bad row with its line number and errors, and offers no import", async () => {
    await useOwnerSession(browser());
    await browser().open("/admin/products");
    await browser().waitForText("Import CSV");
    await browser().clickRole("link", "Import CSV");
    await browser().waitForUrl(`**${IMPORT_PAGE}`);

    await check(
      csvFile(
        "bad.csv",
        [
          "name,price,sku",
          "[E2E] Import Pad,49,E2E-IMP-001",
          "[E2E] Import Broken,12.345,E2E-IMP-002",
          "[E2E] Import Ghost,10,E2E-IMP-003",
        ].join("\n") + "\n",
      ),
    );
    await browser().waitForText("3 rows: 2 will be created, 0 skipped, 1 with errors.");
    const preview = await browser().text('table[aria-label="Import preview"]');
    expect(preview).toContain("[E2E] Import Broken");
    expect(preview).toMatch(/price:/);
    expect(await browser().text("main")).toContain(
      "Fix the rows with errors and check the file again. Nothing has been imported.",
    );
    expect(await browser().count('input[name="intent"][value="import"]')).toBe(0);
  });

  it("imports a fixed file (semicolons, BOM, quoted multi-line text) as drafts", async () => {
    await useOwnerSession(browser());
    const fixed = csvFile(
      "fixed.csv",
      "﻿" +
        [
          "Name;Price;SKU;Description;Stock",
          "[E2E] Import Pad;49,90;e2e-imp-001;Cloth surface.;20",
          '[E2E] Import Mat;19;E2E-IMP-002;"Line one;\nline two";',
        ].join("\r\n") +
        "\r\n",
    );
    await check(fixed);
    await browser().waitForText("2 rows: 2 will be created, 0 skipped, 0 with errors.");
    expect(await browser().count(FILE_INPUT)).toBe(0);

    await browser().clickRole("button", "Import 2 products");
    await browser().waitForText("Imported 2 products: 2 drafts, 0 published.");
    await browser().clickRole("link", "[E2E] Import Mat");
    await browser().waitForText("Stock history");
    expect(await browser().value("#product-description")).toBe("Line one;\nline two");

    await browser().open("/admin/products");
    await browser().waitForText("[E2E] Import Pad");
    const list = await browser().text('table[aria-label="Products"]');
    expect(list).toContain("E2E-IMP-001");
    expect(list).toMatch(/\[E2E\] Import Pad[\s\S]*Hidden/);

    // Checking the same file again skips every row: an import never changes a product.
    await check(fixed);
    await browser().waitForText("2 rows: 0 will be created, 2 skipped, 0 with errors.");
    expect(await browser().text("main")).toContain(
      "Every row is already in the catalog. Nothing to import.",
    );
    expect(await browser().count('input[name="intent"][value="import"]')).toBe(0);
  });
});
