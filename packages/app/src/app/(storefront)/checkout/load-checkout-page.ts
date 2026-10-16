import "server-only";
import { cartFingerprint, type PricedCart } from "@commerceos/core";
import { readCartLines } from "@/server/cart/cart-cookie";
import { loadWithRequestScope, type LoadResult } from "@/server/load-with-request-scope";
import { newIdempotencyKey } from "@/server/orders/order-crypto";

export type CheckoutPageData = {
  cart: PricedCart;
  /** Generated on every render (spec A7), so the form works without JavaScript. */
  idempotencyKey: string;
  /** The lines this page shows, which the action compares with the cookie. */
  cartFingerprint: string;
};

/** The checkout's data: the cookie's cart priced from the catalog, plus the form's hidden values. */
export async function loadCheckoutPage(): Promise<LoadResult<CheckoutPageData>> {
  const lines = await readCartLines();
  return loadWithRequestScope({ page: "/checkout" }, async (cradle) => {
    const cart = await cradle.getCartUseCase.execute({ lines });
    return {
      cart,
      idempotencyKey: newIdempotencyKey(),
      cartFingerprint: cartFingerprint(cart.storedLines),
    };
  });
}
