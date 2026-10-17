import { cartItemCount, removeLine, type CartLine } from "../../domain/cart/cart";
import {
  parseCartLineInput,
  removeCartLineSchema,
  type RemoveCartLineRequest,
} from "../../validators/cart/cart-line.schema";
import type { CartChange } from "./load-priced-cart";

/**
 * Removes a line from the cart (cart spec, API Contracts `removeCartLine`). Needs no catalog
 * data: removing a line that is not there is a no-op. Only a malformed id is refused.
 */
export class RemoveCartLineUseCase {
  async execute(input: {
    lines: readonly CartLine[];
    request: RemoveCartLineRequest;
  }): Promise<CartChange> {
    const { productId } = parseCartLineInput(removeCartLineSchema, input.request);
    const lines = removeLine(input.lines, productId);
    return { lines, itemCount: cartItemCount(lines) };
  }
}
