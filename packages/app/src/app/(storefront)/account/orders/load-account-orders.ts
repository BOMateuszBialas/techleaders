import "server-only";
import type { CustomerOrderDto, CustomerOrderList } from "@commerceos/core";
import { loadWithRequestScope, type LoadResult } from "@/server/load-with-request-scope";

/**
 * "My orders" data for the signed-in customer (E07 spec A12, A13). `customerId` is the id the
 * page's guard returned (`requireCustomerPage()`), never a URL or form value (A14). A database
 * failure is `error` (the page shows its generic message), never another customer's data.
 */
export async function loadAccountOrders(
  customerId: string,
): Promise<LoadResult<CustomerOrderList>> {
  return loadWithRequestScope({ page: "/account/orders" }, (cradle) =>
    cradle.listCustomerOrdersUseCase.execute({ customerId }),
  );
}

/**
 * One of the customer's own orders. A malformed, unknown or foreign id is `not-found` (the same
 * account "Order not found" page, A11); the id never reaches the log context.
 */
export async function loadAccountOrder(
  customerId: string,
  orderId: string,
): Promise<LoadResult<CustomerOrderDto>> {
  return loadWithRequestScope({ page: "/account/orders/[id]" }, (cradle) =>
    cradle.getCustomerOrderUseCase.execute({ customerId, orderId }),
  );
}
