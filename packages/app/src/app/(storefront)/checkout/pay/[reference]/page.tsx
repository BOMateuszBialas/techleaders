import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { connection } from "next/server";
import { Suspense } from "react";
import {
  NOT_PAYABLE_MESSAGE,
  ORDER_UNAVAILABLE_MESSAGE,
  PAY_HEADING,
} from "@/components/checkout/checkout-copy";
import { PayForm } from "@/components/checkout/order-forms";
import { DemoPaymentBanner } from "@/components/checkout/order-forms-view";
import { OrderSummary } from "@/components/checkout/order-summary";
import { confirmDemoPayment } from "@/server/orders/order.action";
import { TOO_MANY_LOOKUPS_MESSAGE } from "@/server/orders/order-lookup-limit";
import { orderPaths } from "@/server/orders/order-paths";
import { loadOrderPage } from "../../../orders/load-order-page";

/** The URL carries a bearer reference: never indexed, never sent on as a referrer (spec UI/UX). */
export const metadata: Metadata = {
  title: "Demo payment",
  robots: { index: false, follow: false },
  referrer: "no-referrer",
};

type PayPageProps = PageProps<"/checkout/pay/[reference]">;

/** The demo payment step (cart spec A9, G4): a banner, the summary and one button. */
export default function PayPage({ params }: PayPageProps) {
  return (
    <>
      <h1 className="text-3xl font-semibold tracking-tight">{PAY_HEADING}</h1>
      <DemoPaymentBanner />
      <Suspense
        fallback={
          <div aria-label="Loading order" className="h-48 animate-pulse rounded bg-muted" />
        }
      >
        <PayContents params={params} />
      </Suspense>
    </>
  );
}

async function PayContents({ params }: { params: PayPageProps["params"] }) {
  const { reference } = await params;
  await connection();
  const result = await loadOrderPage("/checkout/pay/[reference]", reference);

  // Control flow after the loader mapped every error (never inside a try block).
  if (result.kind === "not-found") notFound();
  if (result.kind === "error") {
    return (
      <p role="alert" className="text-sm text-destructive">
        {ORDER_UNAVAILABLE_MESSAGE}
      </p>
    );
  }
  if (result.data.kind === "limited") return <p role="alert">{TOO_MANY_LOOKUPS_MESSAGE}</p>;

  const { order } = result.data;
  if (order.paidAt) redirect(orderPaths.order(order.reference));
  return (
    <div className="flex flex-col gap-4">
      <p className="text-sm">
        Order reference: <span className="font-mono font-semibold">{order.reference}</span>
      </p>
      <OrderSummary
        items={order.items}
        subtotal={order.subtotal}
        shipping={order.shipping}
        total={order.total}
      />
      {order.status === "pending_payment" ? (
        <PayForm action={confirmDemoPayment} reference={order.reference} />
      ) : (
        <p role="alert">{NOT_PAYABLE_MESSAGE}</p>
      )}
    </div>
  );
}
