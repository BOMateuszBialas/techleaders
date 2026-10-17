import { addLine, cartItemCount, findLine, type CartLine } from "../../domain/cart/cart";
import { isPurchasable } from "../../domain/products/product";
import { ConflictError, NotFoundError, ValidationError } from "../../errors/app-error";
import type { CatalogReadPort } from "../../ports/catalog-read.port";
import { addToCartSchema, type AddToCartRequest } from "../../validators/cart/cart-line.schema";
import { parseInput } from "../../validators/parse-input";
import { loadPricedCart, type CartChange } from "./load-priced-cart";

export const PRODUCT_UNAVAILABLE_MESSAGE = "This product is no longer available.";
export const OUT_OF_STOCK_MESSAGE = "This product is out of stock.";
export const ONE_CURRENCY_MESSAGE = "Your cart can hold products in one currency only.";

/** Shown when the stock cannot cover the quantity asked for (spec #16 AC3). */
export function onlyLeftMessage(stock: number, inCart: number): string {
  return inCart > 0
    ? `Only ${stock} left in stock, and ${inCart} already in your cart.`
    : `Only ${stock} left in stock.`;
}

/**
 * "Add to cart" (cart spec, API Contracts `addToCart`). Only a published product with stock can
 * be added, and never more than its stock in total. Stock is not reserved (A3): this check is
 * feedback, the conditional decrement at order placement is authoritative.
 *
 * Failures: `ValidationError` (bad input, cart limits, another currency), `NotFoundError`
 * (unknown or unpublished product), `ConflictError` (out of stock, only N left).
 */
export class AddToCartUseCase {
  constructor(private readonly deps: { catalogRepository: CatalogReadPort }) {}

  async execute(input: {
    lines: readonly CartLine[];
    request: AddToCartRequest;
  }): Promise<CartChange & { productName: string }> {
    const { productId, quantity } = parseInput(addToCartSchema, input.request);
    const { cart, products } = await loadPricedCart(this.deps.catalogRepository, input.lines, [
      productId,
    ]);

    const product = products.find((record) => record.id === productId);
    if (!product || product.status !== "published") {
      throw new NotFoundError(PRODUCT_UNAVAILABLE_MESSAGE);
    }
    if (!isPurchasable(product)) throw new ConflictError(OUT_OF_STOCK_MESSAGE);
    if (cart.subtotal && cart.subtotal.currency !== product.currency) {
      throw new ValidationError(ONE_CURRENCY_MESSAGE);
    }

    const inCart = findLine(cart.storedLines, productId)?.quantity ?? 0;
    if (inCart + quantity > product.stockQuantity) {
      throw new ConflictError(onlyLeftMessage(product.stockQuantity, inCart));
    }

    const lines = addLine(cart.storedLines, productId, quantity);
    return { lines, itemCount: cartItemCount(lines), productName: product.name };
  }
}
