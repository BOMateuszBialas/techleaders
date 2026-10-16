import "server-only";
import type { PricedCart } from "@commerceos/core";
import { readCartLines } from "@/server/cart/cart-cookie";
import { loadWithRequestScope, type LoadResult } from "@/server/load-with-request-scope";

/**
 * The cart page's data: the cookie's lines priced from the catalog. Unavailable lines and
 * quantities above the stock are corrected in the result (G12, G13); the cookie itself is
 * rewritten by the next cart change, because a Server Component cannot set cookies.
 */
export async function loadCartPage(): Promise<LoadResult<PricedCart>> {
  const lines = await readCartLines();
  return loadWithRequestScope({ page: "/cart" }, (cradle) =>
    cradle.getCartUseCase.execute({ lines }),
  );
}
