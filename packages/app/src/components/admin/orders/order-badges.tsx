import { ORDER_STATUS_LABELS, type OrderStatus } from "@commerceos/core";
import { Badge } from "@/components/ui/badge";
import { DEMO_BADGE, orderOriginLabel } from "./order-copy";

const STATUS_VARIANTS: Record<OrderStatus, "default" | "secondary" | "outline" | "destructive"> = {
  pending_payment: "outline",
  paid: "secondary",
  processing: "secondary",
  shipped: "default",
  cancelled: "destructive",
  refunded: "outline",
};

/** The order's status as text (never colour only, spec UI/UX "Accessibility"). */
export function OrderStatusBadge({ status }: { status: OrderStatus }) {
  return (
    <Badge variant={STATUS_VARIANTS[status]} className="border-border">
      {ORDER_STATUS_LABELS[status]}
    </Badge>
  );
}

/** Marks a seeded `DEMO-` order (orders spec A13, R07). */
export function DemoBadge() {
  return (
    <Badge variant="outline" className="border-demo bg-demo-surface text-demo">
      {DEMO_BADGE}
    </Badge>
  );
}

/** "Account order" or "Guest order" (E07 spec A18), as text. */
export function OrderOriginBadge({ placedWithAccount }: { placedWithAccount: boolean }) {
  return (
    <Badge variant={placedWithAccount ? "secondary" : "outline"} className="border-border">
      {orderOriginLabel(placedWithAccount)}
    </Badge>
  );
}
