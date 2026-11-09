import type { OrderAdminPort } from "../../ports/order-admin.port";
import { parseListPage } from "../../validators/common/list-page.schema";
import { ADMIN_ORDERS_PAGE_SIZE } from "../../validators/orders/order-status-change.schema";
import { toAdminOrderListRow, type AdminOrderList } from "./admin-order.dto";

/** `all` is every order, newest first; `unpaid` is the `pending_payment` orders, oldest first. */
export type AdminOrdersView = "all" | "unpaid";

/**
 * `/admin/orders` (orders spec A7): 25 orders per page, newest first. `page` is the raw query
 * value; anything that is not a whole number from 1 is page 1. A page beyond the last returns
 * no rows (the page offers a link back to page 1). `view` is the raw query value too: only
 * `"unpaid"` selects the unpaid view; anything else is `all` (unpaid-orders visibility).
 */
export class ListAdminOrdersUseCase {
  constructor(private readonly deps: { orderAdminRepository: OrderAdminPort }) {}

  async execute(input: { page?: unknown; view?: unknown } = {}): Promise<AdminOrderList> {
    const page = parseListPage(input.page);
    const view: AdminOrdersView = input.view === "unpaid" ? "unpaid" : "all";
    const unpaid = view === "unpaid";
    const { rows, total } = await this.deps.orderAdminRepository.listOrders({
      offset: (page - 1) * ADMIN_ORDERS_PAGE_SIZE,
      limit: ADMIN_ORDERS_PAGE_SIZE,
      status: unpaid ? "pending_payment" : undefined,
      oldestFirst: unpaid,
    });
    return {
      rows: rows.map(toAdminOrderListRow),
      page,
      pageCount: Math.max(1, Math.ceil(total / ADMIN_ORDERS_PAGE_SIZE)),
      total,
      view,
    };
  }
}
