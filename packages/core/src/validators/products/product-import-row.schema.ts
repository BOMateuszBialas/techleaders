import type { CsvRecord } from "../../domain/imports/csv";
import { PRODUCT_STATUSES } from "../../domain/products/product";
import { ValidationError } from "../../errors/app-error";
import { createProductInputSchema, type CreateProductInput } from "./product-input.schema";

/**
 * The rules for one row of a product import (CSV import spec A4, A5, A8, A10, A11). A row is
 * mapped onto the new-product form's fields and checked by `createProductInputSchema`, so an
 * imported product follows exactly the rules of one typed into the form. The import adds only
 * what a file needs on top: column names, formula and control-character refusal, demo
 * markers, and the `status`, `featured` and `category` cell values.
 */

/** The columns an import file may have, in the order the template uses (spec A8). */
export const PRODUCT_IMPORT_COLUMNS = [
  "name",
  "slug",
  "description",
  "price",
  "sku",
  "category",
  "image_url",
  "status",
  "stock",
  "featured",
] as const;
export type ProductImportColumn = (typeof PRODUCT_IMPORT_COLUMNS)[number];

const REQUIRED_COLUMNS: readonly ProductImportColumn[] = ["name", "price"];

/** Where each column sits in the file's rows. */
export type ProductImportHeader = ReadonlyMap<ProductImportColumn, number>;

/** A category a row may name, by slug or by name (spec A5). */
export type ImportCategory = { id: string; slug: string; name: string };

/** A row's cells by column, trimmed; a column the file does not have is "". */
export type ProductImportCells = Record<ProductImportColumn, string>;

export type ProductImportRowCheck = { line: number; cells: ProductImportCells } & (
  { ok: true; input: CreateProductInput } | { ok: false; errors: string[] }
);

/** The form field each product-form error belongs to → the column the owner sees. */
const FIELD_COLUMNS: Record<string, ProductImportColumn> = {
  name: "name",
  slug: "slug",
  description: "description",
  price: "price",
  sku: "sku",
  categoryId: "category",
  imageUrl: "image_url",
  status: "status",
  stockQuantity: "stock",
  featured: "featured",
};

/** Text columns a spreadsheet could run as a formula when the data goes back into one (A10). */
const TEXT_COLUMNS: readonly ProductImportColumn[] = ["name", "description", "sku", "category"];
const FORMULA_PREFIX = /^[=+\-@]/;
/** Control and invisible format characters (zero-width, bidi, soft hyphen, BOM): refused. */
const INVISIBLE_CHARACTER = /[\p{Cc}\p{Cf}]/u;
const DEMO_TEXT_MARKER = /\[demo\]/i;
const DEMO_SKU_PREFIX = "DEMO-";
/** `featured` cell values → the form's checkbox value ("on" ticked, "" not). */
const FEATURED_VALUES: Record<string, string> = {
  "": "",
  no: "",
  false: "",
  "0": "",
  yes: "on",
  true: "on",
  "1": "on",
};
const MAX_QUOTED_LENGTH = 60;

export const DEMO_MARKER_MESSAGE =
  "DEMO- SKUs and [DEMO] mark the seeded demo data. Use your own SKU and text.";

/** A value quoted in a message, shortened so a long cell does not flood the preview. */
function quote(value: string): string {
  const short = value.length > MAX_QUOTED_LENGTH ? `${value.slice(0, MAX_QUOTED_LENGTH)}…` : value;
  return `"${short}"`;
}

function isImportColumn(value: string): value is ProductImportColumn {
  return (PRODUCT_IMPORT_COLUMNS as readonly string[]).includes(value);
}

/**
 * Reads the header row (spec A8): column names are case-insensitive and may come in any
 * order; an unknown, unnamed or repeated column, or a missing `name` or `price`, is a file
 * problem, so a typo never silently drops a column.
 */
export function readProductImportHeader(cells: string[]): ProductImportHeader {
  const header = new Map<ProductImportColumn, number>();
  cells.forEach((cell, index) => {
    const name = cell.trim().toLowerCase();
    if (name === "") throw new ValidationError(`Column ${index + 1} of the header has no name.`);
    if (!isImportColumn(name)) {
      throw new ValidationError(
        `Unknown column ${quote(cell.trim())}. Use only: ${PRODUCT_IMPORT_COLUMNS.join(", ")}.`,
      );
    }
    if (header.has(name)) throw new ValidationError(`The column "${name}" appears twice.`);
    header.set(name, index);
  });
  for (const column of REQUIRED_COLUMNS) {
    if (!header.has(column)) throw new ValidationError(`The file has no "${column}" column.`);
  }
  return header;
}

function readCells(record: CsvRecord, header: ProductImportHeader): ProductImportCells {
  const cell = (column: ProductImportColumn): string => {
    const index = header.get(column);
    return index === undefined ? "" : (record.cells[index] ?? "").trim();
  };
  return {
    name: cell("name"),
    slug: cell("slug"),
    description: cell("description"),
    price: cell("price"),
    sku: cell("sku"),
    category: cell("category"),
    image_url: cell("image_url"),
    status: cell("status"),
    stock: cell("stock"),
    featured: cell("featured"),
  };
}

/** Formula prefixes, invisible characters and demo markers (spec A10, A11). */
function textProblems(cells: ProductImportCells): string[] {
  const problems: string[] = [];
  for (const column of PRODUCT_IMPORT_COLUMNS) {
    const value = column === "description" ? cells[column].replace(/\n/g, "") : cells[column];
    if (INVISIBLE_CHARACTER.test(value)) {
      problems.push(`${column}: contains invisible or control characters. Remove them.`);
    }
  }
  for (const column of TEXT_COLUMNS) {
    const prefix = FORMULA_PREFIX.exec(cells[column])?.[0];
    if (prefix) {
      problems.push(
        `${column}: starts with "${prefix}", which spreadsheets run as a formula. Remove it.`,
      );
    }
  }
  const isDemo =
    cells.sku.toUpperCase().startsWith(DEMO_SKU_PREFIX) ||
    DEMO_TEXT_MARKER.test(cells.name) ||
    DEMO_TEXT_MARKER.test(cells.description);
  if (isDemo) problems.push(DEMO_MARKER_MESSAGE);
  return problems;
}

/** The category a cell names: a slug first, else a unique name, both case-insensitive (A5). */
function resolveCategory(
  value: string,
  categories: readonly ImportCategory[],
): { id: string } | { problem: string } {
  const key = value.toLowerCase();
  const bySlug = categories.find((category) => category.slug === key);
  if (bySlug) return { id: bySlug.id };
  const byName = categories.filter((category) => category.name.toLowerCase() === key);
  const [only] = byName;
  if (only && byName.length === 1) return { id: only.id };
  return {
    problem:
      byName.length > 1
        ? `category: ${quote(value)} is the name of more than one category. Use the category slug.`
        : `category: unknown category ${quote(value)}. Use the slug or name of an existing category, or leave it blank.`,
  };
}

/** A product-form error as the owner reads it in the preview: the column, then the message. */
export function describeIssue(issue: { path: readonly PropertyKey[]; message: string }): string {
  const column = FIELD_COLUMNS[String(issue.path[0])] ?? "row";
  return `${column}: ${issue.message}`;
}

/**
 * Checks one row: cell count, text rules, cell values, then the product form's own rules.
 * Every problem of the row is reported at once, so the owner fixes it in one pass.
 */
export function checkProductImportRow(
  record: CsvRecord,
  header: ProductImportHeader,
  categories: readonly ImportCategory[],
): ProductImportRowCheck {
  const cells = readCells(record, header);
  const base = { line: record.line, cells };
  if (record.cells.length !== header.size) {
    return {
      ...base,
      ok: false,
      errors: [`Has ${record.cells.length} values; the header has ${header.size}.`],
    };
  }

  const errors = textProblems(cells);
  const status = cells.status.toLowerCase();
  const isKnownStatus = status === "" || (PRODUCT_STATUSES as readonly string[]).includes(status);
  if (!isKnownStatus) errors.push("status: use draft or published.");
  const featured = FEATURED_VALUES[cells.featured.toLowerCase()];
  if (featured === undefined) errors.push("featured: use yes or no.");
  const category = cells.category === "" ? { id: "" } : resolveCategory(cells.category, categories);
  if ("problem" in category) errors.push(category.problem);

  const result = createProductInputSchema.safeParse({
    name: cells.name,
    slug: cells.slug,
    description: cells.description,
    price: cells.price,
    sku: cells.sku,
    categoryId: "id" in category ? category.id : "",
    imageUrl: cells.image_url,
    featured: featured ?? "",
    status: isKnownStatus ? status : "",
    stockQuantity: cells.stock === "" ? "0" : cells.stock,
  });
  if (!result.success) errors.push(...result.error.issues.map(describeIssue));
  if (!result.success || errors.length > 0) return { ...base, ok: false, errors };
  return { ...base, ok: true, input: result.data };
}
