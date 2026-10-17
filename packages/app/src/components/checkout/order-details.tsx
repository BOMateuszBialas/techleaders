import Link from "next/link";
import type { OrderView } from "@commerceos/core";
import { orderPaths } from "@/server/orders/order-paths";
import {
  COMPLETE_PAYMENT_LINK,
  ORDER_STATUS_HEADING,
  PAID_HEADING,
  PAID_WITH_DEMO,
  SAVE_REFERENCE_NOTE,
} from "./checkout-copy";
import { OrderStatusBadge } from "./order-forms-view";
import { OrderSummary } from "./order-summary";

/**
 * The order page (cart spec, UI/UX "/orders/[reference]"): the reference (copy-friendly,
 * monospace), the status, items and totals, and how it was paid. Never the customer's name,
 * email or address (A8). Right after the demo payment (`justPaid`) the heading thanks the
 * shopper; a pending order links back to the payment step.
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
        <p className="text-sm font-medium">{PAID_WITH_DEMO}</p>
      ) : null}
      {order.status === "pending_payment" ? (
        <Link
          href={orderPaths.pay(order.reference)}
          className="w-fit text-sm font-medium underline underline-offset-4"
        >
          {COMPLETE_PAYMENT_LINK}
        </Link>
      ) : null}
      <Link href={orderPaths.lookup} className="w-fit text-sm underline underline-offset-4">
        Look up another order
      </Link>
    </div>
  );
}
