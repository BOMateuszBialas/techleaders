import { priceCart, type CartLine, type PricedCart } from "../../domain/cart/cart";
import type { CatalogProductRecord, CatalogReadPort } from "../../ports/catalog-read.port";

/** The result every cart change returns: the lines to store and the badge count. */
export type CartChange = { lines: CartLine[]; itemCount: number };

/**
 * Loads the products of the stored lines (plus `extraIds`, e.g. the product being added) in one
 * query and prices the cart with them. No query runs for an empty cart.
 */
export async function loadPricedCart(
  catalog: CatalogReadPort,
  lines: readonly CartLine[],
  extraIds: readonly string[] = [],
): Promise<{ cart: PricedCart; products: CatalogProductRecord[] }> {
  const ids = [...new Set([...lines.map((line) => line.productId), ...extraIds])];
  const products = ids.length > 0 ? await catalog.findProductsByIds(ids) : [];
  return { cart: priceCart(lines, products), products };
}
