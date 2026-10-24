import { formatMoney, type AdminOrderView } from "@commerceos/core";
import type { Metadata } from "next";
import { headers } from "next/headers";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import {
  DemoBadge,
  OrderOriginBadge,
  OrderStatusBadge,
} from "@/components/admin/orders/order-badges";
import {
  DELETED_PRODUCT_LABEL,
  DEMO_ORDER_NOTE,
  DEMO_PAYMENT_LABEL,
  NOT_PAID_LABEL,
  ORDERS_PATH,
  SHIPPING_FREE_LABEL,
  formatOrderDateTime,
} from "@/components/admin/orders/order-copy";
import { OrderStatusForm } from "@/components/admin/orders/order-status-form";
import { productPath } from "@/components/admin/products/product-copy";
import { ownerLocale } from "@/components/admin/products/stock-copy";
import {
  Table,
  TableBody,
  TableCaption,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { requireAdminPage } from "@/server/auth/require-admin";
import { changeOrderStatus } from "@/server/orders/order-status.action";
import { AdminPageLoadError } from "../../categories/load-categories";
import { loadAdminOrder } from "../load-orders";

export const metadata: Metadata = { title: "Order" };

type OrderPageProps = PageProps<"/admin/orders/[id]">;

export default function OrderPage({ params }: OrderPageProps) {
  return (
    <div className="flex max-w-4xl flex-col gap-6">
      <Link href={ORDERS_PATH} className="w-fit text-sm underline underline-offset-4">
        All orders
      </Link>
      <Suspense fallback={<p className="text-sm text-muted-foreground">Loading order…</p>}>
        <OrderDetails params={params} />
      </Suspense>
    </div>
  );
}

async function OrderDetails({ params }: Pick<OrderPageProps, "params">) {
  await requireAdminPage();
  const { id } = await params;
  const result = await loadAdminOrder(id);

  // Control flow runs after the loader has mapped every error (never inside a try block).
  if (result.kind === "not-found") notFound();
  if (result.kind === "error") throw new AdminPageLoadError();
  const order = result.data;
  const locale = ownerLocale((await headers()).get("accept-language"));
  const at = (date: Date) => (
    <time dateTime={date.toISOString()}>{formatOrderDateTime(date, locale)}</time>
  );

  return (
    <div className="flex flex-col gap-8">
      <div className="flex flex-col gap-2">
        <h1 className="font-mono text-2xl font-semibold tracking-tight select-all">
          {order.reference}
        </h1>
        <div className="flex flex-wrap items-center gap-2" role="group" aria-label="Order status">
          <OrderStatusBadge status={order.status} />
          {order.isDemo ? <DemoBadge /> : null}
          <OrderOriginBadge placedWithAccount={order.placedWithAccount} />
        </div>
        <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1 text-sm">
          <dt className="text-muted-foreground">Placed</dt>
          <dd>{at(order.createdAt)}</dd>
          <dt className="text-muted-foreground">Paid</dt>
          <dd>{order.paidAt ? at(order.paidAt) : NOT_PAID_LABEL}</dd>
          <dt className="text-muted-foreground">Last updated</dt>
          <dd>{at(order.updatedAt)}</dd>
        </dl>
        {order.isDemo ? (
          <p className="rounded-md border border-amber-500/50 bg-amber-50 p-3 text-sm dark:bg-amber-950/30">
            {DEMO_ORDER_NOTE}
          </p>
        ) : null}
      </div>
      <OrderItems order={order} />
      <div className="grid gap-6 sm:grid-cols-2">
        <section aria-labelledby="customer-heading" className="flex flex-col gap-1 text-sm">
          <h2 id="customer-heading" className="text-lg font-semibold">
            Customer
          </h2>
          <p>{order.customer.name}</p>
          <p>{order.customer.email}</p>
          <address className="not-italic">
            {order.shippingAddress.line1}
            <br />
            {order.shippingAddress.line2 ? (
              <>
                {order.shippingAddress.line2}
                <br />
              </>
            ) : null}
            {order.shippingAddress.postalCode} {order.shippingAddress.city}
            <br />
            {order.shippingAddress.country}
          </address>
        </section>
        <section aria-labelledby="payment-heading" className="flex flex-col gap-1 text-sm">
          <h2 id="payment-heading" className="text-lg font-semibold">
            Payment
          </h2>
          {order.payment ? (
            <>
              <p>{DEMO_PAYMENT_LABEL}</p>
              {order.payment.reference ? (
                <p className="font-mono text-muted-foreground">{order.payment.reference}</p>
              ) : null}
            </>
          ) : (
            <p>{NOT_PAID_LABEL}</p>
          )}
        </section>
      </div>
      <OrderStatusForm
        action={changeOrderStatus}
        order={{
          id: order.id,
          status: order.status,
          restockableUnits: order.restockableUnits,
          allowedTransitions: order.allowedTransitions,
        }}
      />
    </div>
  );
}

function OrderItems({ order }: { order: AdminOrderView }) {
  return (
    <section aria-labelledby="items-heading" className="flex flex-col gap-3">
      <h2 id="items-heading" className="text-lg font-semibold">
        Items
      </h2>
      <Table>
        <TableCaption className="sr-only">
          Items of this order, with the name, SKU and price saved when it was placed
        </TableCaption>
        <TableHeader>
          <TableRow>
            <TableHead>Product</TableHead>
            <TableHead>SKU</TableHead>
            <TableHead className="text-right">Unit price</TableHead>
            <TableHead className="text-right">Quantity</TableHead>
            <TableHead className="text-right">Line total</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {order.items.map((item) => (
            <TableRow key={item.id}>
              <TableCell>
                {item.productId ? (
                  <Link
                    href={productPath(item.productId)}
                    className="underline-offset-4 hover:underline"
                  >
                    {item.name}
                  </Link>
                ) : (
                  <span>
                    {item.name}{" "}
                    <span className="text-muted-foreground">{DELETED_PRODUCT_LABEL}</span>
                  </span>
                )}
              </TableCell>
              <TableCell className="text-muted-foreground">{item.sku ?? "—"}</TableCell>
              <TableCell className="text-right tabular-nums">
                {formatMoney(item.unitPrice)}
              </TableCell>
              <TableCell className="text-right tabular-nums">{item.quantity}</TableCell>
              <TableCell className="text-right tabular-nums">
                {formatMoney(item.lineTotal)}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
      <dl className="ml-auto grid grid-cols-[auto_auto] gap-x-6 gap-y-1 text-sm">
        <dt>Subtotal</dt>
        <dd className="text-right tabular-nums">{formatMoney(order.subtotal)}</dd>
        <dt>Shipping</dt>
        <dd className="text-right">
          {order.shipping.amountMinor === 0 ? SHIPPING_FREE_LABEL : formatMoney(order.shipping)}
        </dd>
        <dt className="font-semibold">Total</dt>
        <dd className="text-right font-semibold tabular-nums" data-testid="order-total">
          {formatMoney(order.total)}
        </dd>
      </dl>
    </section>
  );
}
