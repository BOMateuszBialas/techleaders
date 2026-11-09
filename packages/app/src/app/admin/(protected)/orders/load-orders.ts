import "server-only";
import type { AdminOrderList, AdminOrderView } from "@commerceos/core";
import { firstQueryValue } from "@/lib/first-query-value";
import { loadWithRequestScope, type LoadResult } from "@/server/load-with-request-scope";

/**
 * One page of `/admin/orders`: newest first, or the unpaid view (`view=unpaid`, oldest first).
 * Both values are the raw query parameters; the use case falls back to all orders and page 1.
 */
export function loadAdminOrders(
  page: string | string[] | undefined,
  view?: string | string[] | undefined,
): Promise<LoadResult<AdminOrderList>> {
  return loadWithRequestScope({ page: "/admin/orders" }, (cradle) =>
    cradle.listAdminOrdersUseCase.execute({
      page: firstQueryValue(page),
      view: firstQueryValue(view),
    }),
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
