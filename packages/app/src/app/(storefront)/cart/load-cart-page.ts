import "server-only";
import type { PricedCart } from "@commerceos/core";
import { readCartLines } from "@/server/cart/cart-cookie";
import { loadWithRequestScope, type LoadResult } from "@/server/load-with-request-scope";

/**
 * The cart page's data: the cookie's lines priced from the catalog. Unavailable lines and
 * quantities above the stock are corrected in the result (G12, G13); the cookie itself is
 * rewritten by the next cart change, because a Server Component cannot set cookies.
 * `logInvalid: false` is for the drawer, which every storefront page renders (see the layout).
 */
export async function loadCartPage(
  options: { logInvalid?: boolean } = {},
): Promise<LoadResult<PricedCart>> {
  const lines = await readCartLines(options);
  return loadWithRequestScope({ page: "/cart" }, (cradle) =>
    cradle.getCartUseCase.execute({ lines }),
  );
}
