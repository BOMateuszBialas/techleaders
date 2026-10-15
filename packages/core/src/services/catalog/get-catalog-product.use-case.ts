import { NotFoundError } from "../../errors/app-error";
import type { CatalogReadPort } from "../../ports/catalog-read.port";
import { productSlugSchema } from "../../validators/catalog/slug.schema";
import { toCatalogProductDetail, type CatalogProductDetail } from "./catalog.dto";

/** One product for its storefront page. */
export class GetCatalogProductUseCase {
  constructor(private readonly deps: { catalogRepository: CatalogReadPort }) {}

  /**
   * Throws `NotFoundError` for a malformed slug (without querying), a missing product
   * and a product that is not published. The visibility rule is checked here, not
   * trusted to the query, so a draft can never reach a shopper.
   */
  async execute(input: { slug: string }): Promise<CatalogProductDetail> {
    if (!productSlugSchema.safeParse(input.slug).success) {
      throw new NotFoundError("Product not found.");
    }
    const record = await this.deps.catalogRepository.findProductBySlug(input.slug);
    if (!record || record.status !== "published") throw new NotFoundError("Product not found.");
    return toCatalogProductDetail(record);
  }
}
