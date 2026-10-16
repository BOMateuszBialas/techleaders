import type { CartLine } from "../../domain/cart/cart";
import { OrderConflictError, buildOrderDraft, cartFingerprint } from "../../domain/orders/order";
import { generateOrderReference, type RandomBytes } from "../../domain/orders/order-reference";
import { ValidationError } from "../../errors/app-error";
import type { CatalogReadPort } from "../../ports/catalog-read.port";
import type { OrderRecord, OrderRepositoryPort } from "../../ports/order-repository.port";
import { checkoutSchema, type CheckoutRequest } from "../../validators/orders/checkout.schema";
import { parseInput } from "../../validators/parse-input";
import { loadPricedCart } from "../cart/load-priced-cart";

export const EMPTY_CART_MESSAGE = "Your cart is empty.";
export const CART_CHANGED_MESSAGE = "Your cart changed in another tab. Review it and submit again.";
export const FORM_REUSED_MESSAGE =
  "This checkout form was already used. Review your cart and submit again.";

/** SHA-256 as lowercase hex; the app passes Node's crypto, tests a fake. */
export type Sha256Hex = (text: string) => Promise<string>;

export type PlaceOrderResult = { reference: string; replayed: boolean };

/**
 * Places an order from the cart (cart spec, Phase 2, API Contracts `placeOrder`).
 *
 * 1. The form is validated (field errors, no order).
 * 2. The cookie's lines are priced like the cart page does. A line that must be corrected
 *    (sold out, unpublished, above the stock: G12, G13) is a `cart_changed` conflict carrying
 *    those notices, and the lines must match the `cartFingerprint` the checkout rendered, so a
 *    cart changed meanwhile is never ordered. Prices never come from the client: the form's total is only compared (A6).
 * 3. Idempotency (A7): a known key returns its order when the request fingerprint (cart plus
 *    customer fields, hashed) matches, otherwise `form_reused`. The same lookup runs after a
 *    failed placement, so a double submit that lost the race for the last unit still gets the
 *    order the first submit placed.
 * 4. The repository's transaction decrements stock and inserts the order (pending payment).
 */
export class PlaceOrderUseCase {
  constructor(
    private readonly deps: {
      orderRepository: OrderRepositoryPort;
      catalogRepository: CatalogReadPort;
      randomBytes: RandomBytes;
      sha256Hex: Sha256Hex;
    },
  ) {}

  async execute(input: {
    lines: readonly CartLine[];
    request: CheckoutRequest;
  }): Promise<PlaceOrderResult> {
    const form = parseInput(checkoutSchema, input.request);
    const { idempotencyKey, expectedTotalMinor, cartFingerprint: shown, ...customer } = form;

    if (input.lines.length === 0) throw new ValidationError(EMPTY_CART_MESSAGE);
    const { cart } = await loadPricedCart(this.deps.catalogRepository, input.lines);
    // A line sold out, was unpublished or exceeds the stock now: say what changed (G12, G13).
    if (cart.changed) throw new OrderConflictError("cart_changed", cart.notices.join(" "));
    if (cartFingerprint(cart.storedLines) !== shown) {
      throw new OrderConflictError("cart_changed", CART_CHANGED_MESSAGE);
    }

    const requestFingerprint = await this.deps.sha256Hex(JSON.stringify({ cart: shown, customer }));
    const known = await this.deps.orderRepository.findByIdempotencyKey(idempotencyKey);
    if (known) return replay(known, requestFingerprint);

    try {
      const order = await this.deps.orderRepository.placeOrder({
        idempotencyKey,
        requestFingerprint,
        customer,
        lines: cart.storedLines,
        newReference: () => generateOrderReference(this.deps.randomBytes),
        buildDraft: (reserved) => buildOrderDraft(reserved, expectedTotalMinor),
      });
      return { reference: order.reference, replayed: false };
    } catch (error) {
      // After the rollback: did an identical submit win the race (same key)?
      const winner = await this.deps.orderRepository.findByIdempotencyKey(idempotencyKey);
      if (winner) return replay(winner, requestFingerprint);
      throw error;
    }
  }
}

function replay(order: OrderRecord, requestFingerprint: string): PlaceOrderResult {
  if (order.requestFingerprint !== requestFingerprint) {
    throw new OrderConflictError("form_reused", FORM_REUSED_MESSAGE);
  }
  return { reference: order.reference, replayed: true };
}
