import type { ProductRepositoryPort } from "../../ports/catalog.port";
import { toAdminProduct, type AdminProduct } from "./product.dto";

/** Every product in any status, sorted by name, with its store availability (spec G7). */
export class ListProductsUseCase {
  constructor(private readonly deps: { productRepository: ProductRepositoryPort }) {}

  async execute(): Promise<AdminProduct[]> {
    const products = await this.deps.productRepository.list();
    return products.map(toAdminProduct);
  }
}
