import { z } from "zod";
import { ORDER_STATUSES } from "../../domain/orders/order";

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

/**
 * The `?page=` of the admin order list: a whole number from 1; anything else (missing, `-1`,
 * `abc`, `1.5`) falls back to page 1, never an error page (spec Edge Cases).
 */
export const adminOrderPageSchema = z.coerce.number().int().min(1).max(1_000_000).catch(1);

export function parseAdminOrderPage(value: unknown): number {
  return adminOrderPageSchema.parse(value);
}
