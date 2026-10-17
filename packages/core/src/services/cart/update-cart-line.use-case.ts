import { cartItemCount, findLine, setLineQuantity, type CartLine } from "../../domain/cart/cart";
import { NotFoundError, ValidationError } from "../../errors/app-error";
import type { CatalogReadPort } from "../../ports/catalog-read.port";
import {
  parseCartLineInput,
  updateCartLineSchema,
  type UpdateCartLineRequest,
} from "../../validators/cart/cart-line.schema";
import { PRODUCT_UNAVAILABLE_MESSAGE } from "./add-to-cart.use-case";
import { loadPricedCart, type CartChange } from "./load-priced-cart";

/** The field message for a quantity above the stock (cart spec, API Contracts). */
export function onlyLeftFieldMessage(stock: number): string {
  return `Only ${stock} left in stock.`;
}

/**
 * Changes the quantity of a line in the cart (cart spec, API Contracts `updateCartLine`).
 * A quantity above the stock is refused under the field ("Only N left in stock."); a product
 * that is no longer available (or no longer in the cart) is `NotFoundError`, and the cart page
 * then shows it removed (G12).
 */
export class UpdateCartLineUseCase {
  constructor(private readonly deps: { catalogRepository: CatalogReadPort }) {}

  async execute(input: {
    lines: readonly CartLine[];
    request: UpdateCartLineRequest;
  }): Promise<CartChange> {
    const { productId, quantity } = parseCartLineInput(updateCartLineSchema, input.request);
    const { cart, products } = await loadPricedCart(this.deps.catalogRepository, input.lines);

    const product = products.find((record) => record.id === productId);
    if (!product || !findLine(cart.storedLines, productId)) {
      throw new NotFoundError(PRODUCT_UNAVAILABLE_MESSAGE);
    }
    if (quantity > product.stockQuantity) {
      const message = onlyLeftFieldMessage(product.stockQuantity);
      throw new ValidationError(message, { quantity: [message] });
    }

    const lines = setLineQuantity(cart.storedLines, productId, quantity);
    return { lines, itemCount: cartItemCount(lines) };
  }
}
