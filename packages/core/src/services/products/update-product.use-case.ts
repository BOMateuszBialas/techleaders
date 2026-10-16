import { NotFoundError } from "../../errors/app-error";
import type { ProductRepositoryPort } from "../../ports/catalog.port";
import { isUuid } from "../../validators/common/uuid.schema";
import type { ProductInput } from "../../validators/products/product-input.schema";
import { PRODUCT_NOT_FOUND_MESSAGE, toAdminProduct, type AdminProduct } from "./product.dto";

/**
 * Updates a product's details, including "Featured on home page". Never its stock (spec A14)
 * or its status (`SetProductStatusUseCase`). A malformed or unknown id is `NotFoundError`.
 */
export class UpdateProductUseCase {
  constructor(private readonly deps: { productRepository: ProductRepositoryPort }) {}

  async execute(input: { id: string; values: ProductInput }): Promise<AdminProduct> {
    if (!isUuid(input.id)) throw new NotFoundError(PRODUCT_NOT_FOUND_MESSAGE);
    const updated = await this.deps.productRepository.update(input.id, input.values);
    if (!updated) throw new NotFoundError(PRODUCT_NOT_FOUND_MESSAGE);
    return toAdminProduct(updated);
  }
}
