import { parseCsvText } from "../../domain/imports/csv";
import type { CategoryRepositoryPort } from "../../ports/catalog.port";
import type {
  ExistingProductRef,
  ProductImportRepositoryPort,
} from "../../ports/product-import.port";
import type { CreateProductInput } from "../../validators/products/product-input.schema";
import {
  checkProductImportRow,
  readProductImportHeader,
  type ProductImportRowCheck,
} from "../../validators/products/product-import-row.schema";

export type ProductImportOutcome = "create" | "skip" | "error";

/** One row of the preview, as the owner sees it (values are shown as text, never HTML). */
export type ProductImportPreviewRow = {
  line: number;
  name: string;
  /** The slug and SKU that would be stored (derived and normalised) for a valid row. */
  slug: string;
  sku: string;
  category: string;
  price: string;
  status: string;
  stock: string;
  outcome: ProductImportOutcome;
  /** Why a row is skipped; null otherwise. */
  reason: string | null;
  errors: string[];
};

export type ProductImportPreview = {
  rows: ProductImportPreviewRow[];
  counts: Record<ProductImportOutcome, number>;
  /** How many of the rows to create are published. */
  publishedCount: number;
  /** Identifies exactly what would be created; the confirmation must post it back (A6). */
  fingerprint: string;
};

export type ProductImportPlan = { preview: ProductImportPreview; creates: CreateProductInput[] };

export type ProductImportDeps = {
  categoryRepository: CategoryRepositoryPort;
  productImportRepository: ProductImportRepositoryPort;
};

/** 32-bit FNV-1a; not a security hash: it only detects a change between preview and import. */
function fnv1a(text: string, seed: number): string {
  let hash = seed;
  for (let index = 0; index < text.length; index += 1) {
    hash = Math.imul(hash ^ text.charCodeAt(index), 0x01000193) >>> 0;
  }
  return hash.toString(16).padStart(8, "0");
}

/** A fingerprint of the rows to create: two FNV-1a hashes with different seeds (64 bits). */
export function fingerprintOf(text: string): string {
  return fnv1a(text, 0x811c9dc5) + fnv1a(text, 0x01234567);
}

function displayRow(check: ProductImportRowCheck) {
  const { cells } = check;
  const input = check.ok ? check.input : null;
  return {
    line: check.line,
    name: cells.name,
    slug: input ? input.slug : cells.slug,
    sku: input ? (input.sku ?? "") : cells.sku,
    category: cells.category,
    price: cells.price,
    status: input ? input.status : cells.status,
    stock: input ? String(input.stockQuantity) : cells.stock,
  };
}

/**
 * Turns checked rows into the preview (CSV import spec A1, A12, A18), in file order:
 * 1. a row with any error is `error`, even if its slug or SKU exists;
 * 2. a valid row whose slug or SKU an existing product uses is `skip` (never updated);
 * 3. a valid row repeating the slug or SKU of an earlier valid row is `error`;
 * 4. otherwise `create`.
 */
export function planProductImport(
  checks: ProductImportRowCheck[],
  existing: ExistingProductRef[],
): ProductImportPlan {
  const bySlug = new Map(existing.map((product) => [product.slug, product]));
  const bySku = new Map(existing.map((product) => [product.sku, product]));
  const firstLineOfSlug = new Map<string, number>();
  const firstLineOfSku = new Map<string, number>();
  const creates: { line: number; input: CreateProductInput }[] = [];

  const rows = checks.map((check): ProductImportPreviewRow => {
    const display = displayRow(check);
    if (!check.ok) return { ...display, outcome: "error", reason: null, errors: check.errors };

    const { input } = check;
    const slugOwner = bySlug.get(input.slug);
    const owner = slugOwner ?? (input.sku === null ? undefined : bySku.get(input.sku));
    const errors: string[] = [];
    const slugLine = firstLineOfSlug.get(input.slug);
    const skuLine = input.sku === null ? undefined : firstLineOfSku.get(input.sku);
    if (slugLine !== undefined) errors.push(`slug: same slug as line ${slugLine}.`);
    if (skuLine !== undefined) errors.push(`sku: same SKU as line ${skuLine}.`);
    if (slugLine === undefined) firstLineOfSlug.set(input.slug, check.line);
    if (input.sku !== null && skuLine === undefined) firstLineOfSku.set(input.sku, check.line);

    if (owner) {
      const key = slugOwner ? "slug" : "SKU";
      const reason = `Already in the catalog: "${owner.name}" uses this ${key}. Not changed.`;
      return { ...display, outcome: "skip", reason, errors: [] };
    }
    if (errors.length > 0) return { ...display, outcome: "error", reason: null, errors };
    creates.push({ line: check.line, input });
    return { ...display, outcome: "create", reason: null, errors: [] };
  });

  const count = (outcome: ProductImportOutcome) =>
    rows.filter((row) => row.outcome === outcome).length;
  return {
    creates: creates.map(({ input }) => input),
    preview: {
      rows,
      counts: { create: count("create"), skip: count("skip"), error: count("error") },
      publishedCount: creates.filter(({ input }) => input.status === "published").length,
      fingerprint: fingerprintOf(JSON.stringify(creates)),
    },
  };
}

/**
 * Reads, checks and plans an import file against the current categories and products. File
 * problems throw a `ValidationError`; row problems are part of the plan.
 */
export async function buildProductImportPlan(
  csv: string,
  deps: ProductImportDeps,
): Promise<ProductImportPlan> {
  const parsed = parseCsvText(csv);
  const header = readProductImportHeader(parsed.header);
  const categories = await deps.categoryRepository.list();
  const checks = parsed.records.map((record) => checkProductImportRow(record, header, categories));
  const valid = checks.flatMap((check) => (check.ok ? [check.input] : []));
  const slugs = [...new Set(valid.map((input) => input.slug))];
  const skus = [...new Set(valid.flatMap((input) => (input.sku === null ? [] : [input.sku])))];
  const existing =
    valid.length > 0 ? await deps.productImportRepository.findExisting({ slugs, skus }) : [];
  return planProductImport(checks, existing);
}
