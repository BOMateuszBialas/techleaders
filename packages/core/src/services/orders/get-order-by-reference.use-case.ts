import type { OrderRepositoryPort } from "../../ports/order-repository.port";
import { findOrderByReference, toOrderView, type OrderView } from "./order.dto";

/** The order page's read model, by public reference (cart spec A8). Unknown → `NotFoundError`. */
export class GetOrderByReferenceUseCase {
  constructor(private readonly deps: { orderRepository: OrderRepositoryPort }) {}

  async execute(input: { reference: string }): Promise<OrderView> {
    return toOrderView(await findOrderByReference(this.deps.orderRepository, input.reference));
  }
}
