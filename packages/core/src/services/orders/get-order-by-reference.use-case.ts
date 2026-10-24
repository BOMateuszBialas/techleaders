import type { OrderViewer } from "../../domain/orders/order-access";
import type { OrderRepositoryPort } from "../../ports/order-repository.port";
import { findOrderByReference, toOrderView, type OrderView } from "./order.dto";

/**
 * The order page's read model, by public reference (cart spec A8). Unknown → `NotFoundError`;
 * so is an account order read by anyone but its customer (E07 spec A2). `viewer` is required, so
 * a new caller cannot forget the ownership check (A14).
 */
export class GetOrderByReferenceUseCase {
  constructor(private readonly deps: { orderRepository: OrderRepositoryPort }) {}

  async execute(input: { reference: string; viewer: OrderViewer }): Promise<OrderView> {
    return toOrderView(
      await findOrderByReference(this.deps.orderRepository, input.reference, input.viewer),
    );
  }
}
