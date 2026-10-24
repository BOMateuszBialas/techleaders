import Link from "next/link";
import type { CustomerOrderDto } from "@commerceos/core";
import { COMPLETE_PAYMENT_LINK, PAID_WITH_DEMO } from "@/components/checkout/checkout-copy";
import { OrderStatusBadge } from "@/components/checkout/order-forms-view";
import { OrderSummary } from "@/components/checkout/order-summary";
import { orderPaths } from "@/server/orders/order-paths";
import { ACCOUNT_COPY, ACCOUNT_ORDERS_PATH, formatAccountDate } from "./account-copy";

/**
 * One of the customer's own orders (E07 spec A5, UI/UX "/account/orders/<id>"): reference, date,
 * status, items and totals from the snapshots, the contact and shipping address given at
 * checkout. Read only: no action buttons; a pending order links to its demo payment page.
 */
export function AccountOrderDetailView({ order }: { order: CustomerOrderDto }) {
  const address = order.shippingAddress;
  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-3xl font-semibold tracking-tight">{ACCOUNT_COPY.orderDetailsHeading}</h1>
      <div className="flex flex-col gap-2">
        <p className="text-sm text-muted-foreground">Order reference</p>
        <p className="font-mono text-lg font-semibold select-all wrap-anywhere">
          {order.reference}
        </p>
        <p className="text-sm">
          Placed{" "}
          <time dateTime={order.createdAt.toISOString()}>{formatAccountDate(order.createdAt)}</time>
        </p>
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
      <section aria-label="Shipping address" className="flex flex-col gap-1 text-sm">
        <h2 className="font-medium">Shipping to</h2>
        <p className="wrap-anywhere">{order.contact.name}</p>
        <p className="wrap-anywhere">{order.contact.email}</p>
        <p className="wrap-anywhere">{address.line1}</p>
        {address.line2 ? <p className="wrap-anywhere">{address.line2}</p> : null}
        <p>
          {address.postalCode} {address.city}, {address.country}
        </p>
      </section>
      {order.status === "pending_payment" ? (
        <Link
          href={orderPaths.pay(order.reference)}
          className="w-fit text-sm font-medium underline underline-offset-4"
        >
          {COMPLETE_PAYMENT_LINK}
        </Link>
      ) : null}
      <Link href={ACCOUNT_ORDERS_PATH} className="w-fit text-sm underline underline-offset-4">
        {ACCOUNT_COPY.backToOrders}
      </Link>
    </div>
  );
}
