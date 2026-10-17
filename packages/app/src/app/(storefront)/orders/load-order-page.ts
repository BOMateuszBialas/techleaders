import "server-only";
import type { OrderView } from "@commerceos/core";
import { headers } from "next/headers";
import { loadWithRequestScope, type LoadResult } from "@/server/load-with-request-scope";
import { consumeOrderLookup } from "@/server/orders/order-lookup-limit";

/** `limited`: over the lookup limit (A15); the order was not queried. */
export type OrderPageData = { kind: "limited" } | { kind: "order"; order: OrderView };

/**
 * One order by its public reference, for the payment and order pages. Every call counts against
 * the lookup limit first (cart spec A15), so references cannot be enumerated quickly. The
 * reference is a bearer secret and never reaches the log context; a malformed or unknown one
 * is "not-found".
 */
export async function loadOrderPage(
  page: string,
  reference: string,
): Promise<LoadResult<OrderPageData>> {
  const requestHeaders = await headers();
  return loadWithRequestScope({ page }, async (cradle): Promise<OrderPageData> => {
    if (!(await consumeOrderLookup(cradle.rateLimiter, cradle.env, requestHeaders))) {
      return { kind: "limited" };
    }
    return { kind: "order", order: await cradle.getOrderByReferenceUseCase.execute({ reference }) };
  });
}
