import { z } from "zod";
import { ORDER_STATUSES } from "../../domain/orders/order";
import { listPageSchema, parseListPage } from "../common/list-page.schema";

/** The one message for a status change outside the transition table or with unknown values. */
export const TRANSITION_NOT_ALLOWED_MESSAGE = "This status change is not allowed.";

/**
 * An owner's status change (orders spec, API Contracts `changeOrderStatus`): the order, the
 * status the page showed (`from`, the lost-update guard) and the target. All three come from
 * hidden form fields, so a failure has no visible field to highlight; the use case reports it
 * as one form-level message. The id is checked by the use case (malformed → "not found").
 */
export const orderStatusChangeSchema = z.object({
  orderId: z.string().trim(),
  from: z.enum(ORDER_STATUSES),
  to: z.enum(ORDER_STATUSES),
});

/** What the status form posts: untrusted text, checked by the schema above. */
export type OrderStatusChangeRequest = { orderId: string; from: string; to: string };

/** Orders per admin list page (orders spec A7). */
export const ADMIN_ORDERS_PAGE_SIZE = 25;

/** @deprecated Use `listPageSchema` (`validators/common/list-page.schema`, #67). */
export const adminOrderPageSchema = listPageSchema;

/** @deprecated Use `parseListPage` (`validators/common/list-page.schema`, #67). */
export const parseAdminOrderPage = parseListPage;
