import "server-only";
import type { AdminOrderList, AdminOrderView } from "@commerceos/core";
import { loadWithRequestScope, type LoadResult } from "@/server/load-with-request-scope";

/**
 * The first value of a query parameter (`?page=2&page=3` → "2"); the use case turns anything
 * that is not a page number into page 1.
 */
export function firstQueryValue(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

/** One page of `/admin/orders`, newest first. */
export function loadAdminOrders(
  page: string | string[] | undefined,
): Promise<LoadResult<AdminOrderList>> {
  return loadWithRequestScope({ page: "/admin/orders" }, (cradle) =>
    cradle.listAdminOrdersUseCase.execute({ page: firstQueryValue(page) }),
  );
}

/**
 * One order for `/admin/orders/[id]`; a malformed or unknown id is "not-found". The view holds
 * the customer's personal data: the log context names the page only, never the order.
 */
export function loadAdminOrder(id: string): Promise<LoadResult<AdminOrderView>> {
  return loadWithRequestScope({ page: "/admin/orders/[id]" }, (cradle) =>
    cradle.getAdminOrderUseCase.execute({ id }),
  );
}
