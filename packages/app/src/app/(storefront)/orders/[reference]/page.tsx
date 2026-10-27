import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { connection } from "next/server";
import { Suspense } from "react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Skeleton, SkeletonGroup } from "@/components/ui/skeleton";
import {
  ORDER_LOADING_LABEL,
  ORDER_UNAVAILABLE_MESSAGE,
} from "@/components/checkout/checkout-copy";
import { OrderDetails } from "@/components/checkout/order-details";
import { TOO_MANY_LOOKUPS_MESSAGE } from "@/server/orders/order-lookup-limit";
import { loadOrderPage } from "../load-order-page";

/** The URL carries a bearer reference: never indexed, never sent on as a referrer (spec UI/UX). */
export const metadata: Metadata = {
  title: "Your order",
  robots: { index: false, follow: false },
  referrer: "no-referrer",
};

type OrderPageProps = PageProps<"/orders/[reference]">;

/** The confirmation and status page (cart spec, Phase 3, G7): status, items, totals. */
export default function OrderPage({ params, searchParams }: OrderPageProps) {
  return (
    <Suspense
      fallback={
        <SkeletonGroup label={ORDER_LOADING_LABEL}>
          <Skeleton className="h-64 rounded-card" />
        </SkeletonGroup>
      }
    >
      <OrderContents params={params} searchParams={searchParams} />
    </Suspense>
  );
}

async function OrderContents({ params, searchParams }: OrderPageProps) {
  const { reference } = await params;
  const { paid } = await searchParams;
  await connection();
  const result = await loadOrderPage("/orders/[reference]", reference);

  // Control flow after the loader mapped every error (never inside a try block).
  if (result.kind === "not-found") notFound();
  if (result.kind === "error") {
    return (
      <p role="alert" className="text-sm text-destructive">
        {ORDER_UNAVAILABLE_MESSAGE}
      </p>
    );
  }
  if (result.data.kind === "limited") {
    return (
      <Alert variant="warning" role="alert">
        <AlertDescription>{TOO_MANY_LOOKUPS_MESSAGE}</AlertDescription>
      </Alert>
    );
  }
  return <OrderDetails order={result.data.order} justPaid={paid === "1"} />;
}
