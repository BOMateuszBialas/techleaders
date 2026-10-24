import { NotFoundError } from "../../errors/app-error";
import type { OrderRepositoryPort } from "../../ports/order-repository.port";
import { isUuid } from "../../validators/common/uuid.schema";
import {
  CUSTOMER_ORDER_NOT_FOUND_MESSAGE,
  toCustomerOrder,
  type CustomerOrderDto,
} from "./customer-order.dto";

/**
 * One of the signed-in customer's own orders (E07 spec A11, A12, A14). A malformed id is
 * "not found" before any query; an unknown id and another customer's order are the same "not
 * found", because the repository reads only `where id = :orderId and customer_id = :customerId`.
 * `customerId` comes from the session only.
 */
export class GetCustomerOrderUseCase {
  constructor(private readonly deps: { orderRepository: OrderRepositoryPort }) {}

  async execute(input: { customerId: string; orderId: string }): Promise<CustomerOrderDto> {
    if (!isUuid(input.orderId)) throw new NotFoundError(CUSTOMER_ORDER_NOT_FOUND_MESSAGE);
    const order = await this.deps.orderRepository.findForCustomer(input.customerId, input.orderId);
    if (!order) throw new NotFoundError(CUSTOMER_ORDER_NOT_FOUND_MESSAGE);
    return toCustomerOrder(order);
  }
}
