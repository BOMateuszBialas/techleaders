import { createRequestScope } from "@/server/container";
import { customerApiHandler } from "@/server/customer-auth/require-customer";
import { jsonOk } from "@/server/http/api-result";

/**
 * GET /api/account/orders (E07 spec A12, API Contracts): the signed-in customer's newest 50
 * orders → `ApiResult<{ orders: CustomerOrderSummaryDto[]; capped: boolean }>`. 401 without a
 * customer session (an owner session included). Read only; the customer id is the session's.
 */
export const GET = customerApiHandler("GET /api/account/orders", async (_request, customer) => {
  const scope = createRequestScope();
  try {
    return jsonOk(
      await scope.cradle.listCustomerOrdersUseCase.execute({ customerId: customer.id }),
    );
  } finally {
    await scope.dispose();
  }
});
