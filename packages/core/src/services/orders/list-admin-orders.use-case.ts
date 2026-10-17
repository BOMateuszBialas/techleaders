import type { OrderAdminPort } from "../../ports/order-admin.port";
import {
  ADMIN_ORDERS_PAGE_SIZE,
  parseAdminOrderPage,
} from "../../validators/orders/order-status-change.schema";
import { toAdminOrderListRow, type AdminOrderList } from "./admin-order.dto";

/**
 * `/admin/orders` (orders spec A7): 25 orders per page, newest first. `page` is the raw query
 * value; anything that is not a whole number from 1 is page 1. A page beyond the last returns
 * no rows (the page offers a link back to page 1).
 */
export class ListAdminOrdersUseCase {
  constructor(private readonly deps: { orderAdminRepository: OrderAdminPort }) {}

  async execute(input: { page?: unknown } = {}): Promise<AdminOrderList> {
    const page = parseAdminOrderPage(input.page);
    const { rows, total } = await this.deps.orderAdminRepository.listOrders({
      offset: (page - 1) * ADMIN_ORDERS_PAGE_SIZE,
      limit: ADMIN_ORDERS_PAGE_SIZE,
    });
    return {
      rows: rows.map(toAdminOrderListRow),
      page,
      pageCount: Math.max(1, Math.ceil(total / ADMIN_ORDERS_PAGE_SIZE)),
      total,
    };
  }
}
