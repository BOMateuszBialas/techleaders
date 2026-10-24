import type { OrderRepositoryPort } from "../../ports/order-repository.port";
import {
  CUSTOMER_ORDERS_LIMIT,
  toCustomerOrderSummary,
  type CustomerOrderList,
} from "./customer-order.dto";

/**
 * "My orders" (E07 spec A12, A13): the signed-in customer's newest 50 orders, newest first.
 * `customerId` comes from the session only (A14); the repository filters by it in SQL. One extra
 * row is read to tell whether the list is capped.
 */
export class ListCustomerOrdersUseCase {
  constructor(private readonly deps: { orderRepository: OrderRepositoryPort }) {}

  async execute(input: { customerId: string }): Promise<CustomerOrderList> {
    const rows = await this.deps.orderRepository.listForCustomer(
      input.customerId,
      CUSTOMER_ORDERS_LIMIT + 1,
    );
    return {
      orders: rows.slice(0, CUSTOMER_ORDERS_LIMIT).map(toCustomerOrderSummary),
      capped: rows.length > CUSTOMER_ORDERS_LIMIT,
    };
  }
}
