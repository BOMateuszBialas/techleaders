import { ORDER_STATUS_LABELS, type OrderStatus } from "@commerceos/core";
import type { VariantProps } from "class-variance-authority";
import { Badge, type badgeVariants } from "@/components/ui/badge";
import { DEMO_BADGE, orderOriginLabel } from "./order-copy";

type BadgeVariant = NonNullable<VariantProps<typeof badgeVariants>["variant"]>;

/** The status colour map (D5, tokeny rule 10). Every status also has its text; never colour alone. */
const STATUS_VARIANTS: Record<OrderStatus, BadgeVariant> = {
  pending_payment: "warning",
  paid: "success",
  processing: "secondary",
  shipped: "outline",
  cancelled: "destructive",
  refunded: "outline",
};

/** Extra text class for a status whose variant alone is not strong enough (D5: shipped). */
const STATUS_TEXT_CLASSES: Partial<Record<OrderStatus, string>> = {
  shipped: "text-foreground",
};

/** The order's status as text (never colour only, spec UI/UX "Accessibility"). */
export function OrderStatusBadge({ status }: { status: OrderStatus }) {
  return (
    <Badge variant={STATUS_VARIANTS[status]} className={STATUS_TEXT_CLASSES[status]}>
      {ORDER_STATUS_LABELS[status]}
    </Badge>
  );
}

/** Marks a seeded `DEMO-` order (orders spec A13, R07; D8: demo variant, never warning). */
export function DemoBadge() {
  return <Badge variant="demo">{DEMO_BADGE}</Badge>;
}

/** "Account order" or "Guest order" (E07 spec A18), as text. */
export function OrderOriginBadge({ placedWithAccount }: { placedWithAccount: boolean }) {
  return (
    <Badge variant={placedWithAccount ? "secondary" : "outline"}>
      {orderOriginLabel(placedWithAccount)}
    </Badge>
  );
}
