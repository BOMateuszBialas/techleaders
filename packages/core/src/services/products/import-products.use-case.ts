import { ConflictError, hasAppErrorCode } from "../../errors/app-error";
import type { ImportedProductRef } from "../../ports/product-import.port";
import {
  buildProductImportPlan,
  type ProductImportDeps,
  type ProductImportPreview,
} from "./product-import-plan";

export const PRODUCT_IMPORT_CONFLICT_MESSAGE =
  "The catalog changed while importing, so this import was stopped and rolled back. Check the file again.";

/**
 * A write conflict inside the import transaction (a slug or SKU taken, or a category deleted,
 * after the plan was made): every row was rolled back (CSV import spec, Edge Cases).
 */
export class ProductImportConflictError extends ConflictError {
  constructor() {
    super(PRODUCT_IMPORT_CONFLICT_MESSAGE);
  }
}

export type ProductImportResult =
  | { kind: "imported"; created: ImportedProductRef[]; preview: ProductImportPreview }
  /** The file or the catalog changed since the preview, or it cannot be imported: nothing written. */
  | { kind: "changed"; preview: ProductImportPreview };

/**
 * Imports a previewed file (CSV import spec A2, A6). The server trusts nothing from the
 * preview: it reads, checks and plans the posted text again, and writes only when the plan
 * has no errors, creates something, and its fingerprint equals the one the owner confirmed.
 * All rows are created in one transaction or none.
 */
export class ImportProductsUseCase {
  constructor(private readonly deps: ProductImportDeps) {}

  async execute(input: { csv: string; fingerprint: string }): Promise<ProductImportResult> {
    const { preview, creates } = await buildProductImportPlan(input.csv, this.deps);
    const isImportable =
      preview.counts.error === 0 && creates.length > 0 && preview.fingerprint === input.fingerprint;
    if (!isImportable) return { kind: "changed", preview };

    try {
      const created = await this.deps.productImportRepository.createMany(creates);
      return { kind: "imported", created, preview };
    } catch (error) {
      // A field-level error from the adapter means the catalog moved under the transaction.
      if (hasAppErrorCode(error, "CONFLICT") || hasAppErrorCode(error, "VALIDATION_FAILED")) {
        throw new ProductImportConflictError();
      }
      throw error;
    }
  }
}
