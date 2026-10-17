import { NotFoundError } from "../../errors/app-error";
import type { OrderAdminPort } from "../../ports/order-admin.port";
import { isUuid } from "../../validators/common/uuid.schema";
import {
  ADMIN_ORDER_NOT_FOUND_MESSAGE,
  toAdminOrderView,
  type AdminOrderView,
} from "./admin-order.dto";

/** `/admin/orders/<id>` (A16: the order uuid, never the reference). Malformed or unknown → not found. */
export class GetAdminOrderUseCase {
  constructor(private readonly deps: { orderAdminRepository: OrderAdminPort }) {}

  async execute(input: { id: string }): Promise<AdminOrderView> {
    if (!isUuid(input.id)) throw new NotFoundError(ADMIN_ORDER_NOT_FOUND_MESSAGE);
    const order = await this.deps.orderAdminRepository.findOrderById(input.id);
    if (!order) throw new NotFoundError(ADMIN_ORDER_NOT_FOUND_MESSAGE);
    return toAdminOrderView(order);
  }
}
