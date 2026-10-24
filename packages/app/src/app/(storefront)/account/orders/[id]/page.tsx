import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { ACCOUNT_COPY } from "@/components/account/account-copy";
import { AccountOrderDetailView } from "@/components/account/account-order-detail-view";
import { requireCustomerPage } from "@/server/customer-auth/require-customer";
import { loadAccountOrder } from "../load-account-orders";

export const metadata: Metadata = { title: "Your order", robots: { index: false } };

type AccountOrderPageProps = PageProps<"/account/orders/[id]">;

/**
 * One of the customer's own orders (E07 spec A11): read only (A5). The session is read at
 * request time inside `<Suspense>` (A23); a malformed, unknown or foreign id shows the same
 * account "Order not found" page.
 */
export default function AccountOrderPage({ params }: AccountOrderPageProps) {
  return (
    <Suspense
      fallback={
        <div aria-label="Loading your order" className="h-64 animate-pulse rounded bg-muted" />
      }
    >
      <AccountOrderDetail params={params} />
    </Suspense>
  );
}

async function AccountOrderDetail({ params }: Pick<AccountOrderPageProps, "params">) {
  const customer = await requireCustomerPage();
  const { id } = await params;
  const result = await loadAccountOrder(customer.id, id);
  // Control flow after the loader mapped every error (never inside a try block).
  if (result.kind === "not-found") notFound();
  if (result.kind === "error") {
    return (
      <p role="alert" className="text-sm text-destructive">
        {ACCOUNT_COPY.orderUnavailable}
      </p>
    );
  }
  return <AccountOrderDetailView order={result.data} />;
}
