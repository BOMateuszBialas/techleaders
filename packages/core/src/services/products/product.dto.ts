import { getStoreAvailability, type StoreAvailability } from "../../domain/products/product";
import type { AdminProductRecord } from "../../ports/catalog.port";

/** A product for the admin screens, with where it stands in the store (spec D05). */
export type AdminProduct = AdminProductRecord & { availability: StoreAvailability };

export const PRODUCT_NOT_FOUND_MESSAGE = "Product not found.";

export function toAdminProduct(record: AdminProductRecord): AdminProduct {
  return { ...record, availability: getStoreAvailability(record) };
}
