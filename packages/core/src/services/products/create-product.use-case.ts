import type { ProductRepositoryPort } from "../../ports/catalog.port";
import type { CreateProductInput } from "../../validators/products/product-input.schema";
import { toAdminProduct, type AdminProduct } from "./product.dto";

/**
 * Creates a product from validated input, with its initial status and stock (spec A14). A
 * taken slug or SKU is a `UniqueFieldConflictError`; a missing category a `ValidationError`.
 */
export class CreateProductUseCase {
  constructor(private readonly deps: { productRepository: ProductRepositoryPort }) {}

  async execute(input: CreateProductInput): Promise<AdminProduct> {
    return toAdminProduct(await this.deps.productRepository.create(input));
  }
}
