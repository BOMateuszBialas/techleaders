import type {
  ImportedProductRef,
  ProductImportOutcome,
  ProductImportPreview,
} from "@commerceos/core";
import type { ActionState } from "@/lib/action-state";
import { PRODUCTS_PATH } from "./product-copy";

/** The import page (CSV import spec, UI/UX). */
export const PRODUCT_IMPORT_PATH = `${PRODUCTS_PATH}/import`;

/**
 * What `submitProductImport` returns: the usual form state plus the preview (with the checked
 * text and its fingerprint, posted back on confirm) or the created products. Client-safe.
 */
export type ProductImportState = ActionState & {
  preview?: ProductImportPreview;
  /** The checked text, posted back unchanged by the confirm form (spec A6). */
  csv?: string;
  fileName?: string;
  created?: ImportedProductRef[];
};

export const IMPORT_INTRO =
  "Add many products at once from a CSV file. Existing products are never changed: a row whose slug or SKU is already used is skipped.";
export const FILE_LABEL = "CSV file";
export const FILE_HINT =
  "UTF-8, comma or semicolon separated, at most 256 KB and 500 rows. The first line names the columns.";
export const CHECK_BUTTON = "Check file";
export const CHECKING_BUTTON = "Checking…";
export const IMPORTING_BUTTON = "Importing…";
export const CHOOSE_FILE_MESSAGE = "Choose a CSV file to check.";
export const HAS_ERRORS_NOTE =
  "Fix the rows with errors and check the file again. Nothing has been imported.";
export const NOTHING_TO_IMPORT_NOTE = "Every row is already in the catalog. Nothing to import.";
export const IMPORT_CHANGED_MESSAGE =
  "The file or the catalog changed since the check, or the file cannot be imported as it is. Nothing was imported. Review the new check below.";
export const IMPORT_ANOTHER = "Import another file";
export const CHECK_ANOTHER = "Check another file";
export const TEMPLATE_LINK = "Download template";
export const TEMPLATE_FILE_NAME = "product-import-template.csv";

/**
 * The template the page offers (spec A15): semicolon separated, so a decimal comma needs no
 * quotes, with one published and one draft example.
 */
export const IMPORT_TEMPLATE = [
  "name;slug;description;price;sku;category;image_url;status;stock;featured",
  "Example Wireless Mouse;;A light wireless mouse.;199,90;EX-MOU-001;mice;;draft;10;no",
  'Example Mousepad;example-mousepad;"Cloth surface, stitched edges.";49;EX-PAD-001;mousepads;;published;25;yes',
].join("\n");

export function templateHref(): string {
  return `data:text/csv;charset=utf-8,${encodeURIComponent(IMPORT_TEMPLATE)}`;
}

/** The columns table on the page. */
export const IMPORT_COLUMN_HELP: { column: string; rule: string }[] = [
  { column: "name", rule: "Required. Up to 200 characters." },
  { column: "price", rule: "Required. PLN, for example 249.90 or 249,90." },
  { column: "slug", rule: "Optional. Derived from the name when blank." },
  { column: "description", rule: "Optional. Plain text, up to 5,000 characters." },
  { column: "sku", rule: "Optional. Saved in capitals." },
  { column: "category", rule: "Optional. The slug or name of an existing category." },
  { column: "image_url", rule: "Optional. An address starting with https://." },
  { column: "status", rule: "Optional. draft (default) or published." },
  { column: "stock", rule: "Optional. The initial stock, a whole number; blank is 0." },
  { column: "featured", rule: "Optional. yes or no (default)." },
];

export const IMPORT_RULES_NOTE =
  'Text must not start with "=", "+", "-" or "@" (spreadsheet formulas), and DEMO- SKUs and [DEMO] text are reserved for the demo data. One row with an error stops the whole import.';

export const OUTCOME_LABELS: Record<ProductImportOutcome, string> = {
  create: "Create",
  skip: "Skip",
  error: "Error",
};

function plural(count: number, one: string, many: string): string {
  return `${count} ${count === 1 ? one : many}`;
}

/** "3 rows: 1 will be created, 1 skipped, 1 with errors." */
export function previewSummary(preview: ProductImportPreview): string {
  const { create, skip, error } = preview.counts;
  const rows = plural(create + skip + error, "row", "rows");
  return `${rows}: ${create} will be created, ${skip} skipped, ${error} with errors.`;
}

/** The confirm button: "Import 2 products" (", 1 of them published"). */
export function importButtonLabel(preview: ProductImportPreview): string {
  const label = `Import ${plural(preview.counts.create, "product", "products")}`;
  return preview.publishedCount > 0 ? `${label} (${preview.publishedCount} published)` : label;
}

/** The result sentence after an import (spec A14). */
export function importedMessage(created: ImportedProductRef[], skipped: number): string {
  const published = created.filter((product) => product.status === "published").length;
  const imported = `Imported ${plural(created.length, "product", "products")}: ${plural(created.length - published, "draft", "drafts")}, ${published} published.`;
  return skipped > 0
    ? `${imported} ${plural(skipped, "row", "rows")} skipped because ${skipped === 1 ? "it is" : "they are"} already in the catalog.`
    : imported;
}
