import type { OrderStatus } from "@commerceos/core";
import type { VariantProps } from "class-variance-authority";
import type { badgeVariants } from "@/components/ui/badge";

/** The `Badge` variants (retrofit Phase 3, tokeny.md §7 rule 10). */
export type OrderStatusBadgeVariant = NonNullable<VariantProps<typeof badgeVariants>["variant"]>;

/**
 * The storefront's status mapping (checkout spec C7, OA-4, approved): a badge variant per order
 * status, so a status is told apart by more than its colour and always shows its text. The
 * `Record` is exhaustive: a new `OrderStatus` fails the typecheck here until it has a variant.
 * The admin keeps its own mapping until the admin phase (checkout spec Q4).
 */
const STATUS_VARIANTS: Record<OrderStatus, OrderStatusBadgeVariant> = {
  pending_payment: "warning",
  paid: "success",
  processing: "secondary",
  shipped: "outline",
  cancelled: "destructive",
  refunded: "outline",
};

/** The badge variant for an order status (pure; unit-tested for every status). */
export function orderStatusBadgeVariant(status: OrderStatus): OrderStatusBadgeVariant {
  return STATUS_VARIANTS[status];
}
