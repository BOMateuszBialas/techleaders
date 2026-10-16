import { hasPublishablePrice } from "../../domain/products/product";
import { NotFoundError, ValidationError } from "../../errors/app-error";
import type { ProductRepositoryPort } from "../../ports/catalog.port";
import { isUuid } from "../../validators/common/uuid.schema";
import { INVALID_FIELDS_MESSAGE } from "../../validators/parse-input";
import {
  PUBLISHED_PRICE_MESSAGE,
  type ProductInput,
} from "../../validators/products/product-input.schema";
import { PRODUCT_NOT_FOUND_MESSAGE, toAdminProduct, type AdminProduct } from "./product.dto";

/**
 * Updates a product's details, including "Featured on home page". Never its stock (spec A14)
 * or its status (`SetProductStatusUseCase`). A malformed or unknown id is `NotFoundError`. A
 * published product cannot be saved at 0.00 (`ValidationError` on the price, #41).
 */
export class UpdateProductUseCase {
  constructor(private readonly deps: { productRepository: ProductRepositoryPort }) {}

  async execute(input: { id: string; values: ProductInput }): Promise<AdminProduct> {
    if (!isUuid(input.id)) throw new NotFoundError(PRODUCT_NOT_FOUND_MESSAGE);
    if (input.values.priceMinor === 0) await this.assertMayBeFree(input.id);
    const updated = await this.deps.productRepository.update(input.id, input.values);
    if (!updated) throw new NotFoundError(PRODUCT_NOT_FOUND_MESSAGE);
    return toAdminProduct(updated);
  }

  private async assertMayBeFree(id: string): Promise<void> {
    const current = await this.deps.productRepository.findById(id);
    if (!current) throw new NotFoundError(PRODUCT_NOT_FOUND_MESSAGE);
    if (!hasPublishablePrice({ status: current.status, priceMinor: 0 })) {
      throw new ValidationError(INVALID_FIELDS_MESSAGE, { price: [PUBLISHED_PRICE_MESSAGE] });
    }
  }
}
