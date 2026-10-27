import type { OrderView } from "@commerceos/core";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { TextLink } from "@/components/ui/text-link";
import { orderPaths } from "@/server/orders/order-paths";
import {
  COMPLETE_PAYMENT_LINK,
  LOOKUP_ANOTHER_ORDER_LINK,
  ORDER_STATUS_HEADING,
  PAID_HEADING,
  PAID_WITH_TEST,
  SAVE_REFERENCE_NOTE,
} from "./checkout-copy";
import { OrderStatusBadge } from "./order-forms-view";
import { OrderSummary } from "./order-summary";

/**
 * The order page (cart spec, UI/UX "/orders/[reference]"): the reference (copy-friendly,
 * monospace), the status, items and totals, and how it was paid. Never the customer's name,
 * email or address (A8). Right after the demo payment (`justPaid`) the heading thanks the
 * shopper; a pending order links back to the payment step. The paid line is a status (retrofit
 * Phase 3, E02 target), so it is an `Alert success` with `role="status"`.
 */
export function OrderDetails({ order, justPaid }: { order: OrderView; justPaid: boolean }) {
  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-3xl font-semibold tracking-tight">
        {justPaid && order.paidAt ? PAID_HEADING : ORDER_STATUS_HEADING}
      </h1>
      <div className="flex flex-col gap-2">
        <p className="text-sm text-muted-foreground">Order reference</p>
        <p className="font-mono text-lg font-semibold select-all" data-testid="order-reference">
          {order.reference}
        </p>
        <p className="text-sm">{SAVE_REFERENCE_NOTE}</p>
        <div className="flex items-center gap-2 text-sm">
          Status: <OrderStatusBadge status={order.status} />
        </div>
      </div>
      <OrderSummary
        items={order.items}
        subtotal={order.subtotal}
        shipping={order.shipping}
        total={order.total}
      />
      {order.paidAt && order.paymentProvider === "demo" ? (
        <Alert variant="success" role="status">
          <AlertDescription>{PAID_WITH_TEST}</AlertDescription>
        </Alert>
      ) : null}
      {order.status === "pending_payment" ? (
        <TextLink href={orderPaths.pay(order.reference)} variant="standalone">
          {COMPLETE_PAYMENT_LINK}
        </TextLink>
      ) : null}
      <TextLink href={orderPaths.lookup} variant="standalone">
        {LOOKUP_ANOTHER_ORDER_LINK}
      </TextLink>
    </div>
  );
}
