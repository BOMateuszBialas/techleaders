import { money } from "../../domain/money";
import { OrderNotPayableError } from "../../domain/orders/order";
import { NotFoundError } from "../../errors/app-error";
import type { OrderRepositoryPort } from "../../ports/order-repository.port";
import type { PaymentGateway } from "../../ports/payment-gateway.port";
import { ORDER_NOT_FOUND_MESSAGE, findOrderByReference } from "../orders/order.dto";

export type ConfirmPaymentResult = {
  orderId: string;
  reference: string;
  outcome: "paid" | "already_paid";
};

/**
 * Confirms the demo payment of an order (cart spec, Phase 3, A9). Idempotent: an order already
 * paid is a success without calling the gateway again (sequential calls). Otherwise the
 * gateway authorizes with the order id as its idempotency key, outside any transaction (a
 * real gateway is a network call), and a conditional update marks the order paid; of two
 * concurrent confirmations only one update wins, and both report success. A cancelled order
 * is `OrderNotPayableError`; an unknown reference `NotFoundError`.
 */
export class ConfirmDemoPaymentUseCase {
  constructor(
    private readonly deps: { orderRepository: OrderRepositoryPort; paymentGateway: PaymentGateway },
  ) {}

  async execute(input: { reference: string }): Promise<ConfirmPaymentResult> {
    const order = await findOrderByReference(this.deps.orderRepository, input.reference);
    if (order.paidAt !== null) {
      return { orderId: order.id, reference: order.reference, outcome: "already_paid" };
    }
    if (order.status !== "pending_payment") throw new OrderNotPayableError();

    const { providerReference } = await this.deps.paymentGateway.authorize({
      idempotencyKey: order.id,
      amount: money(order.totalMinor, order.currency),
    });
    const result = await this.deps.orderRepository.markPaid(order.id, {
      provider: this.deps.paymentGateway.provider,
      reference: providerReference,
    });
    if (result === "not_found") throw new NotFoundError(ORDER_NOT_FOUND_MESSAGE);
    if (result === "not_payable") throw new OrderNotPayableError();
    return { orderId: order.id, reference: order.reference, outcome: result };
  }
}
