import type { ProductImportPreview, ProductImportPreviewRow } from "@commerceos/core";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import {
  CHECK_ANOTHER,
  EMPTY_FILE_TITLE,
  HAS_ERRORS_NOTE,
  IMPORT_ANOTHER,
  IMPORT_CHANGED_MESSAGE,
  IMPORT_TEMPLATE,
  importButtonLabel,
  importedMessage,
  NOTHING_TO_IMPORT_NOTE,
  previewSummary,
  templateHref,
  type ProductImportState,
} from "./product-import-copy";
import { ProductImportForm, withoutPreviousState } from "./product-import-form";
import { ProductImportView } from "./product-import-view";

const action = vi.fn();

function row(overrides: Partial<ProductImportPreviewRow>): ProductImportPreviewRow {
  return {
    line: 2,
    name: "Example Mouse",
    slug: "example-mouse",
    sku: "EX-MOU-001",
    category: "mice",
    price: "199,90",
    status: "draft",
    stock: "10",
    outcome: "create",
    reason: null,
    errors: [],
    ...overrides,
  };
}

function preview(rows: ProductImportPreviewRow[], publishedCount = 0): ProductImportPreview {
  const count = (outcome: ProductImportPreviewRow["outcome"]) =>
    rows.filter((entry) => entry.outcome === outcome).length;
  return {
    rows,
    counts: { create: count("create"), skip: count("skip"), error: count("error") },
    publishedCount,
    fingerprint: "0123456789abcdef",
  };
}

const ready = preview(
  [
    row({}),
    row({ line: 3, name: "Pad", slug: "pad", status: "published", outcome: "create" }),
    row({ line: 5, name: "Old", outcome: "skip", reason: 'Already in the catalog: "Old".' }),
  ],
  1,
);
const withErrors = preview([
  row({}),
  row({
    line: 4,
    name: "<b>Bad</b>",
    outcome: "error",
    errors: ["price: Enter a price such as 249.90 or 249,90.", "sku: same SKU as line 2."],
  }),
]);
const nothingToCreate = preview([row({ outcome: "skip", reason: "Already in the catalog." })]);

function render(state: ProductImportState, pending = false): string {
  return renderToStaticMarkup(createElement(ProductImportView, { action, state, pending }));
}

describe("product import copy", () => {
  it("summarises the preview", () => {
    expect(previewSummary(ready)).toBe("3 rows: 2 will be created, 1 skipped, 0 with errors.");
    expect(previewSummary(nothingToCreate)).toBe(
      "1 row: 0 will be created, 1 skipped, 0 with errors.",
    );
  });

  it("names the confirm button with the published count when any", () => {
    expect(importButtonLabel(ready)).toBe("Import 2 products (1 published)");
    expect(importButtonLabel(preview([row({})]))).toBe("Import 1 product");
  });

  it("describes the result with drafts, published and skipped rows", () => {
    const created = [
      { id: "p-1", name: "A", status: "draft" as const },
      { id: "p-2", name: "B", status: "published" as const },
    ];
    expect(importedMessage(created, 0)).toBe("Imported 2 products: 1 draft, 1 published.");
    expect(importedMessage(created.slice(0, 1), 1)).toBe(
      "Imported 1 product: 1 draft, 0 published. 1 row skipped because it is already in the catalog.",
    );
    expect(importedMessage(created, 3)).toBe(
      "Imported 2 products: 1 draft, 1 published. 3 rows skipped because they are already in the catalog.",
    );
  });

  it("offers a semicolon template with every column as a data URL", () => {
    expect(IMPORT_TEMPLATE.split("\n")[0]).toBe(
      "name;slug;description;price;sku;category;image_url;status;stock;featured",
    );
    expect(IMPORT_TEMPLATE.split("\n")).toHaveLength(3);
    expect(decodeURIComponent(templateHref().replace("data:text/csv;charset=utf-8,", ""))).toBe(
      IMPORT_TEMPLATE,
    );
  });
});

describe("ProductImportView", () => {
  it("shows only the upload form before the first check", () => {
    const html = render({ status: "idle" });
    expect(html).toContain('type="file"');
    expect(html).toContain('accept=".csv,text/csv"');
    expect(html).toContain('name="intent" value="preview"');
    expect(html).toContain(">Check file<");
    expect(html).not.toContain('role="alert"');
    expect(html).not.toContain('role="status"');
    expect(html).not.toContain("Import preview");
  });

  it("disables the check button while checking", () => {
    const html = render({ status: "idle" }, true);
    expect(html).toContain("Checking…");
    expect(html).toMatch(/<button[^>]*disabled/);
  });

  it("shows a file problem as an alert above the upload form", () => {
    const html = render({ status: "error", message: "The file has no price column." });
    expect(html).toContain('role="alert"');
    expect(html).toContain('type="file"');
    expect(html).toContain('aria-invalid="true"');
    expect(html).toContain('aria-describedby="product-import-file-hint product-import-file-error"');
    expect(html).toContain('id="product-import-file-error"><p role="alert"');
    expect(html).not.toContain("Import preview");
  });

  it("lists every row with its errors, offers no import and escapes cell text", () => {
    const html = render({
      status: "success",
      message: previewSummary(withErrors),
      preview: withErrors,
      csv: "x",
      fileName: "products.csv",
    });
    expect(html).toContain("products.csv: 2 rows: 1 will be created, 0 skipped, 1 with errors.");
    expect(html).toContain(">Error<");
    expect(html).toContain("price: Enter a price such as 249.90 or 249,90.");
    expect(html).toContain("sku: same SKU as line 2.");
    expect(html).toContain("&lt;b&gt;Bad&lt;/b&gt;");
    expect(html).toContain(HAS_ERRORS_NOTE);
    expect(html).toContain('type="file"');
    expect(html).not.toContain('value="import"');
  });

  it("offers the import with the checked text and fingerprint for a clean preview", () => {
    const html = render({
      status: "success",
      message: previewSummary(ready),
      preview: ready,
      csv: "name;price\nA;1",
      fileName: "products.csv",
    });
    expect(html).toContain(">Create<");
    expect(html).toContain(">Skip<");
    expect(html).toContain("Already in the catalog: &quot;Old&quot;.");
    expect(html).toContain('name="intent" value="import"');
    expect(html).toContain('name="csv" value="name;price\nA;1"');
    expect(html).toContain('name="fingerprint" value="0123456789abcdef"');
    expect(html).toContain('name="fileName" value="products.csv"');
    expect(html).toContain(">Import 2 products (1 published)<");
    expect(html).toContain(CHECK_ANOTHER);
    expect(html).not.toContain('type="file"');
  });

  it("disables both buttons while importing", () => {
    const html = render({ status: "success", preview: ready }, true);
    expect(html).toContain("Importing…");
    expect(html.match(/<button[^>]*disabled/g)).toHaveLength(2);
    expect(html).toContain('name="csv" value=""');
    expect(html).toContain('name="fileName" value=""');
  });

  it("says there is nothing to import when every row is skipped", () => {
    const html = render({ status: "success", preview: nothingToCreate });
    expect(html).toContain(NOTHING_TO_IMPORT_NOTE);
    expect(html).toContain("1 row: 0 will be created");
    expect(html).not.toContain('value="import"');
    expect(html).toContain('type="file"');
  });

  it("shows a refused import as an alert with the new preview", () => {
    const html = render({
      status: "error",
      message: IMPORT_CHANGED_MESSAGE,
      preview: ready,
      csv: "x",
    });
    expect(html).toContain('role="alert"');
    expect(html).toContain('name="intent" value="import"');
  });

  it("says the file has no rows when only the header is present", () => {
    const html = render({ status: "success", preview: preview([]) });
    expect(html).toContain(EMPTY_FILE_TITLE);
    expect(html).not.toContain("Import preview");
    expect(html).not.toContain(NOTHING_TO_IMPORT_NOTE);
    expect(html).not.toContain('value="import"');
    expect(html).toContain('type="file"');
  });

  it("shows the outcomes as badges and the notes as alerts without a role", () => {
    const html = render({
      status: "idle",
      preview: ready,
      csv: "x",
      fileName: "products.csv",
    });
    expect(html).toContain('data-slot="badge"');
    expect(html).toContain("bg-success-surface");
    expect(html).toContain('data-variant="info"');
    expect(html).not.toContain('role="alert"');
    expect(html).not.toContain('role="status"');
  });

  it("shows the result with a link to each new product", () => {
    const html = render({
      status: "success",
      message: "Imported 2 products: 1 draft, 1 published.",
      created: [
        { id: "p-1", name: "Mouse", status: "draft" },
        { id: "p-2", name: "Pad", status: "published" },
      ],
    });
    expect(html).toContain('role="status"');
    expect(html).toContain('href="/admin/products/p-1"');
    expect(html).toContain(">Pad<");
    expect(html).toContain(IMPORT_ANOTHER);
    expect(html).toContain('action="/admin/products/import" method="get"');
    expect(html).not.toContain('type="file"');
  });
});

describe("ProductImportForm", () => {
  it("renders the idle view", () => {
    const serverAction = vi.fn(async (state: ProductImportState) => state);
    const html = renderToStaticMarkup(createElement(ProductImportForm, { action: serverAction }));
    expect(html).toContain(">Check file<");
  });

  it("never posts the previous state (preview rows and text) back to the server", async () => {
    const serverAction = vi.fn(async () => ({ status: "success" as const }));
    const data = new FormData();
    await withoutPreviousState(serverAction)(
      { status: "success", preview: ready, csv: "name;price\nA;1" },
      data,
    );
    expect(serverAction).toHaveBeenCalledWith({ status: "idle" }, data);
  });
});
