import { describe, expect, it } from "vitest";
import type { CsvRecord } from "../../domain/imports/csv";
import { PRICE_FORMAT_MESSAGE, PUBLISHED_PRICE_MESSAGE } from "./product-input.schema";
import {
  checkProductImportRow,
  DEMO_MARKER_MESSAGE,
  describeIssue,
  PRODUCT_IMPORT_COLUMNS,
  readProductImportHeader,
  type ImportCategory,
  type ProductImportRowCheck,
} from "./product-import-row.schema";

const MICE: ImportCategory = {
  id: "6f1c2a52-6d0e-4a8b-9a51-3f3a1c1b2d01",
  slug: "mice",
  name: "Mice",
};
const PADS: ImportCategory = {
  id: "6f1c2a52-6d0e-4a8b-9a51-3f3a1c1b2d02",
  slug: "mousepads",
  name: "Pads",
};
const PADS_TWIN: ImportCategory = {
  id: "6f1c2a52-6d0e-4a8b-9a51-3f3a1c1b2d03",
  slug: "pads-2",
  name: "pads",
};
const CATEGORIES = [MICE, PADS];

function messageOf(run: () => unknown): string {
  try {
    run();
  } catch (error) {
    return error instanceof Error ? error.message : String(error);
  }
  throw new Error("expected an error");
}

const FULL_HEADER = readProductImportHeader([...PRODUCT_IMPORT_COLUMNS]);

/** Checks one row of a file with every column, from the values given by column name. */
function check(
  values: Partial<Record<(typeof PRODUCT_IMPORT_COLUMNS)[number], string>>,
  categories: readonly ImportCategory[] = CATEGORIES,
): ProductImportRowCheck {
  const record: CsvRecord = {
    line: 7,
    cells: PRODUCT_IMPORT_COLUMNS.map((column) => values[column] ?? ""),
  };
  return checkProductImportRow(record, FULL_HEADER, categories);
}

function errorsOf(result: ProductImportRowCheck): string[] {
  return result.ok ? [] : result.errors;
}

describe("readProductImportHeader", () => {
  it("maps column names case-insensitively, in any order", () => {
    const header = readProductImportHeader([" Price ", "NAME", "sku"]);
    expect([...header]).toEqual([
      ["price", 0],
      ["name", 1],
      ["sku", 2],
    ]);
  });

  it("refuses an unknown column, naming the allowed ones", () => {
    expect(messageOf(() => readProductImportHeader(["name", "prcie"]))).toBe(
      'Unknown column "prcie". Use only: name, slug, description, price, sku, category, image_url, status, stock, featured.',
    );
  });

  it("shortens a long unknown column name in the message", () => {
    expect(messageOf(() => readProductImportHeader(["x".repeat(70)]))).toContain(
      `"${"x".repeat(60)}…"`,
    );
  });

  it("refuses an unnamed and a repeated column", () => {
    expect(messageOf(() => readProductImportHeader(["name", " ", "price"]))).toBe(
      "Column 2 of the header has no name.",
    );
    expect(messageOf(() => readProductImportHeader(["name", "price", "Name"]))).toBe(
      'The column "name" appears twice.',
    );
  });

  it("requires name and price", () => {
    expect(messageOf(() => readProductImportHeader(["price"]))).toBe(
      'The file has no "name" column.',
    );
    expect(messageOf(() => readProductImportHeader(["name", "sku"]))).toBe(
      'The file has no "price" column.',
    );
  });
});

describe("checkProductImportRow", () => {
  it("maps a full row onto the product form's create input", () => {
    const result = check({
      name: " Phantom Pro Mouse ",
      description: "Light.\nWireless.",
      price: "199,90",
      sku: "phm-001",
      category: "MICE",
      image_url: "https://example.com/phantom.png",
      status: "Published",
      stock: "12",
      featured: "Yes",
    });
    expect(result).toEqual({
      line: 7,
      cells: expect.objectContaining({ name: "Phantom Pro Mouse", category: "MICE" }),
      ok: true,
      input: {
        name: "Phantom Pro Mouse",
        slug: "phantom-pro-mouse",
        description: "Light.\nWireless.",
        priceMinor: 19990,
        sku: "PHM-001",
        categoryId: MICE.id,
        imageUrl: "https://example.com/phantom.png",
        featured: true,
        status: "published",
        stockQuantity: 12,
      },
    });
  });

  it("defaults blank optional cells: draft, stock 0, not featured, no category", () => {
    const header = readProductImportHeader(["name", "price"]);
    const result = checkProductImportRow({ line: 2, cells: ["Pad", "19"] }, header, CATEGORIES);
    expect(result.ok && result.input).toMatchObject({
      status: "draft",
      stockQuantity: 0,
      featured: false,
      categoryId: null,
      sku: null,
      slug: "pad",
    });
    expect(result.cells.featured).toBe("");
  });

  it.each([
    ["no", false],
    ["FALSE", false],
    ["0", false],
    ["true", true],
    ["1", true],
  ])("reads featured %s as %s", (featured, expected) => {
    const result = check({ name: "Pad", price: "1", featured });
    expect(result.ok && result.input.featured).toBe(expected);
  });

  it("refuses unknown status and featured values", () => {
    expect(errorsOf(check({ name: "Pad", price: "1", status: "live", featured: "maybe" }))).toEqual(
      ["status: use draft or published.", "featured: use yes or no."],
    );
  });

  it("finds a category by name when no slug matches, and refuses an ambiguous name", () => {
    const byName = check({ name: "Pad", price: "1", category: "pads" });
    expect(byName.ok && byName.input.categoryId).toBe(PADS.id);

    expect(
      errorsOf(check({ name: "Pad", price: "1", category: "Pads" }, [PADS, PADS_TWIN])),
    ).toEqual(['category: "Pads" is the name of more than one category. Use the category slug.']);
  });

  it("refuses an unknown category instead of creating one", () => {
    expect(errorsOf(check({ name: "Pad", price: "1", category: "Chairs" }))).toEqual([
      'category: unknown category "Chairs". Use the slug or name of an existing category, or leave it blank.',
    ]);
  });

  it.each(["=SUM(A1)", "+1", "-1", "@cmd"])(
    "refuses a text cell starting with a formula character: %s",
    (value) => {
      const errors = errorsOf(
        check({ name: value, description: value, sku: value, category: value, price: "1" }),
      );
      for (const column of ["name", "description", "sku", "category"]) {
        expect(errors).toContain(
          `${column}: starts with "${value[0]}", which spreadsheets run as a formula. Remove it.`,
        );
      }
    },
  );

  it("checks the formula prefix after trimming", () => {
    expect(errorsOf(check({ name: "  =1+1", price: "1" }))[0]).toBe(
      'name: starts with "=", which spreadsheets run as a formula. Remove it.',
    );
  });

  it("refuses control and invisible characters, but allows line breaks in a description", () => {
    expect(errorsOf(check({ name: "Blue​tooth", price: "1" }))).toEqual([
      "name: contains invisible or control characters. Remove them.",
    ]);
    expect(errorsOf(check({ name: "Pad", price: "1", description: "a\tb" }))).toEqual([
      "description: contains invisible or control characters. Remove them.",
    ]);
    expect(check({ name: "Pad", price: "1", description: "a\nb" }).ok).toBe(true);
  });

  it.each([{ sku: "demo-mou-009" }, { name: "[demo] Mouse" }, { description: "[DEMO] A mouse." }])(
    "refuses demo markers: %o",
    (values) => {
      expect(errorsOf(check({ name: "Pad", price: "1", ...values }))).toContain(
        DEMO_MARKER_MESSAGE,
      );
    },
  );

  it("reports the product form's errors under the column names", () => {
    expect(
      errorsOf(
        check({
          name: "Pad",
          price: "12.345",
          image_url: "javascript:alert(1)",
          stock: "-1",
        }),
      ),
    ).toEqual([
      `price: ${PRICE_FORMAT_MESSAGE}`,
      "image_url: Enter an address starting with https://, or leave it blank.",
      "stock: Enter a whole number from 0 to 1,000,000.",
    ]);
  });

  it("refuses a slug the form would refuse", () => {
    expect(errorsOf(check({ name: "Pad", price: "1", slug: "Not A Slug" }))).toEqual([
      "slug: Use lowercase letters, numbers and single hyphens, for example gaming-mice.",
    ]);
  });

  it("refuses a published row at 0.00, like the form", () => {
    expect(errorsOf(check({ name: "Pad", price: "0", status: "published" }))).toEqual([
      `price: ${PUBLISHED_PRICE_MESSAGE}`,
    ]);
  });

  it("refuses a row whose cell count differs from the header", () => {
    expect(checkProductImportRow({ line: 3, cells: ["Pad"] }, FULL_HEADER, [])).toEqual({
      line: 3,
      cells: expect.objectContaining({ name: "Pad", price: "" }),
      ok: false,
      errors: ["Has 1 values; the header has 10."],
    });
  });

  it("combines the import's own problems with the form's", () => {
    expect(errorsOf(check({ name: "=Pad", price: "abc" }))).toEqual([
      'name: starts with "=", which spreadsheets run as a formula. Remove it.',
      `price: ${PRICE_FORMAT_MESSAGE}`,
    ]);
  });
});

describe("describeIssue", () => {
  it("names the column of a form field, or the row when the field is unknown", () => {
    expect(describeIssue({ path: ["categoryId"], message: "x" })).toBe("category: x");
    expect(describeIssue({ path: [], message: "y" })).toBe("row: y");
  });
});
