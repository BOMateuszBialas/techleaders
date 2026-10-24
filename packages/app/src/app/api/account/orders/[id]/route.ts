import { createRequestScope } from "@/server/container";
import { customerApiHandler } from "@/server/customer-auth/require-customer";
import { jsonOk } from "@/server/http/api-result";

/**
 * GET /api/account/orders/<id> (E07 spec A12, API Contracts): one of the signed-in customer's own
 * orders → `ApiResult<CustomerOrderDto>`. A malformed, unknown or foreign id is the same 404
 * body (no 400 on this route); 401 without a customer session. The id selects an order only
 * together with the session's customer id (A14).
 */
export const GET = customerApiHandler(
  "GET /api/account/orders/[id]",
  async (_request, customer, context: RouteContext<"/api/account/orders/[id]">) => {
    const { id } = await context.params;
    const scope = createRequestScope();
    try {
      return jsonOk(
        await scope.cradle.getCustomerOrderUseCase.execute({
          customerId: customer.id,
          orderId: id,
        }),
      );
    } finally {
      await scope.dispose();
    }
  },
);
