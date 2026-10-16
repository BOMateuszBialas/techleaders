import type { ProductStatus } from "../../domain/products/product";
import { NotFoundError } from "../../errors/app-error";
import type { ProductRepositoryPort } from "../../ports/catalog.port";
import { isUuid } from "../../validators/common/uuid.schema";
import { PRODUCT_NOT_FOUND_MESSAGE, toAdminProduct, type AdminProduct } from "./product.dto";

/**
 * Publishes or unpublishes a product and returns it with its new store availability, so the
 * admin can say what changed for shoppers (spec D05, G11).
 */
export class SetProductStatusUseCase {
  constructor(private readonly deps: { productRepository: ProductRepositoryPort }) {}

  async execute(input: { id: string; status: ProductStatus }): Promise<AdminProduct> {
    if (!isUuid(input.id)) throw new NotFoundError(PRODUCT_NOT_FOUND_MESSAGE);
    const updated = await this.deps.productRepository.setStatus(input.id, input.status);
    if (!updated) throw new NotFoundError(PRODUCT_NOT_FOUND_MESSAGE);
    return toAdminProduct(updated);
  }
}
