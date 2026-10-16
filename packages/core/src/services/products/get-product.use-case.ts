import { NotFoundError } from "../../errors/app-error";
import type { ProductRepositoryPort } from "../../ports/catalog.port";
import { isUuid } from "../../validators/common/uuid.schema";
import { PRODUCT_NOT_FOUND_MESSAGE, toAdminProduct, type AdminProduct } from "./product.dto";

/** One product in any status. A malformed or unknown id is `NotFoundError`. */
export class GetProductUseCase {
  constructor(private readonly deps: { productRepository: ProductRepositoryPort }) {}

  async execute(input: { id: string }): Promise<AdminProduct> {
    if (!isUuid(input.id)) throw new NotFoundError(PRODUCT_NOT_FOUND_MESSAGE);
    const product = await this.deps.productRepository.findById(input.id);
    if (!product) throw new NotFoundError(PRODUCT_NOT_FOUND_MESSAGE);
    return toAdminProduct(product);
  }
}
