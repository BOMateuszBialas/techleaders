import type { OrderStatus } from "../../domain/orders/order";
import {
  StaleOrderStatusError,
  canTransition,
  restocksOnTransition,
} from "../../domain/orders/order-status";
import { NotFoundError, ValidationError } from "../../errors/app-error";
import type { OrderAdminPort } from "../../ports/order-admin.port";
import { isUuid } from "../../validators/common/uuid.schema";
import {
  TRANSITION_NOT_ALLOWED_MESSAGE,
  orderStatusChangeSchema,
  type OrderStatusChangeRequest,
} from "../../validators/orders/order-status-change.schema";
import {
  ADMIN_ORDER_NOT_FOUND_MESSAGE,
  toAdminOrderView,
  type AdminOrderView,
} from "./admin-order.dto";

export type ChangeOrderStatusResult = {
  order: AdminOrderView;
  from: OrderStatus;
  to: OrderStatus;
  /** Units returned to stock (a cancel only; deleted products are skipped). */
  restockedUnits: number;
};

/**
 * The owner moves an order through the transition table (orders spec A4, API Contracts
 * `changeOrderStatus`). Unknown values and pairs outside the table are one `ValidationError`
 * ("This status change is not allowed."); nothing reaches the port. The change applies only
 * while the order is still in `from`; otherwise `StaleOrderStatusError` names the status it
 * has now. A cancel of an unpaid order asks the port to restock in the same transaction.
 */
export class ChangeOrderStatusUseCase {
  constructor(private readonly deps: { orderAdminRepository: OrderAdminPort }) {}

  async execute(request: OrderStatusChangeRequest): Promise<ChangeOrderStatusResult> {
    const parsed = orderStatusChangeSchema.safeParse(request);
    if (!parsed.success) throw new ValidationError(TRANSITION_NOT_ALLOWED_MESSAGE);
    const { orderId, from, to } = parsed.data;
    if (!canTransition(from, to)) throw new ValidationError(TRANSITION_NOT_ALLOWED_MESSAGE);
    if (!isUuid(orderId)) throw new NotFoundError(ADMIN_ORDER_NOT_FOUND_MESSAGE);

    const result = await this.deps.orderAdminRepository.changeStatus({
      orderId,
      from,
      to,
      restock: restocksOnTransition(from, to),
    });
    if (result.kind === "not_found") throw new NotFoundError(ADMIN_ORDER_NOT_FOUND_MESSAGE);
    if (result.kind === "stale") throw new StaleOrderStatusError(result.currentStatus);
    return {
      order: toAdminOrderView(result.order),
      from,
      to,
      restockedUnits: result.restockedUnits,
    };
  }
}
