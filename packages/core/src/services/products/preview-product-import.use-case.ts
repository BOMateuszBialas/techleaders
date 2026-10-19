import {
  buildProductImportPlan,
  type ProductImportDeps,
  type ProductImportPreview,
} from "./product-import-plan";

/**
 * Checks an import file without writing anything (CSV import spec, step 2): every row with
 * its line number and outcome. A file problem is a `ValidationError` with one message.
 */
export class PreviewProductImportUseCase {
  constructor(private readonly deps: ProductImportDeps) {}

  async execute(input: { csv: string }): Promise<ProductImportPreview> {
    return (await buildProductImportPlan(input.csv, this.deps)).preview;
  }
}
