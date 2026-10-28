import type { ProductImportPreview, ProductImportPreviewRow } from "@commerceos/core";
import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { expect } from "storybook/test";
import {
  EMPTY_FILE_TITLE,
  HAS_ERRORS_NOTE,
  NOTHING_TO_IMPORT_NOTE,
  type ProductImportState,
} from "@/components/admin/products/product-import-copy";
import { ProductImportView } from "@/components/admin/products/product-import-view";

/**
 * Patterns / Admin / Product import preview. Real view (`ProductImportView`) with fixed previews:
 * no CSV parsing, no database. Each row carries one outcome (create, skip or error) with its
 * text; the confirm button appears only for a preview that can be imported as it is.
 */

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

/** Two new rows and one already in the catalog: importable. */
const IMPORTABLE = preview(
  [
    row({}),
    row({ line: 3, name: "Pulse Pad", slug: "pulse-pad", status: "published" }),
    row({ line: 5, name: "Old Mouse", outcome: "skip", reason: 'Already in the catalog: "Old".' }),
  ],
  1,
);

/** One row with errors blocks the whole import: the upload form stays and nothing is created. */
const WITH_ERRORS = preview([
  row({}),
  row({
    line: 4,
    name: "Bad Row",
    outcome: "error",
    errors: ["price: Enter a price such as 249.90 or 249,90.", "sku: same SKU as line 2."],
  }),
  row({ line: 6, name: "Old Mouse", outcome: "skip", reason: "Already in the catalog." }),
]);

/** Every row is already in the catalog: a note says there is nothing to import. */
const NOTHING_TO_CREATE = preview([row({ outcome: "skip", reason: "Already in the catalog." })]);

const CSV = "name;slug;price\nExample Mouse;example-mouse;199,90";

const meta = {
  title: "Patterns/Admin/Product import preview",
  parameters: { layout: "padded", a11y: { test: "error" } },
  decorators: [
    (Story) => (
      <div data-density="admin" className="max-w-4xl p-4 md:p-6">
        <Story />
      </div>
    ),
  ],
  render: (args: { state: ProductImportState; pending: boolean }) => (
    <ProductImportView action={() => undefined} state={args.state} pending={args.pending} />
  ),
  args: {
    state: { status: "success", preview: IMPORTABLE, csv: CSV, fileName: "products.csv" },
    pending: false,
  },
} satisfies Meta<{ state: ProductImportState; pending: boolean }>;

export default meta;
type Story = StoryObj<typeof meta>;

/** Rows marked create and skip: the confirm button names the count and the published rows. */
export const Importable: Story = {
  play: async ({ canvas }) => {
    await expect(canvas.getByRole("button", { name: /Import 2 products/ })).toBeEnabled();
  },
};

/** A row with errors: the error badge, the note, and no confirm button. */
export const WithErrors: Story = {
  args: {
    state: { status: "error", preview: WITH_ERRORS, csv: CSV, fileName: "products.csv" },
  },
  play: async ({ canvas }) => {
    await expect(canvas.getByText(HAS_ERRORS_NOTE)).toBeVisible();
    await expect(canvas.queryByRole("button", { name: /Import/ })).toBeNull();
  },
};

/** Nothing new to create: the note says so and the confirm button is not offered. */
export const NothingToImport: Story = {
  args: { state: { status: "success", preview: NOTHING_TO_CREATE, csv: CSV } },
  play: async ({ canvas }) => {
    await expect(canvas.getByText(NOTHING_TO_IMPORT_NOTE)).toBeVisible();
  },
};

/** A file with a header and no rows: the message names the first line as the thing to check. */
export const NoRows: Story = {
  args: { state: { status: "success", preview: preview([]), csv: "name;slug" } },
  play: async ({ canvas }) => {
    await expect(canvas.getByText(EMPTY_FILE_TITLE)).toBeVisible();
  },
};
