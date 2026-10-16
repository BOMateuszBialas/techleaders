import type { CartLine, PricedCart } from "../../domain/cart/cart";
import type { CatalogReadPort } from "../../ports/catalog-read.port";
import { loadPricedCart } from "./load-priced-cart";

/**
 * The cart page's read model (cart spec, API Contracts `GetCartUseCase`): the stored lines
 * priced from the catalog, with unavailable lines removed and quantities lowered to the stock,
 * each explained by a notice (G12, G13).
 */
export class GetCartUseCase {
  constructor(private readonly deps: { catalogRepository: CatalogReadPort }) {}

  async execute(input: { lines: readonly CartLine[] }): Promise<PricedCart> {
    return (await loadPricedCart(this.deps.catalogRepository, input.lines)).cart;
  }
}
