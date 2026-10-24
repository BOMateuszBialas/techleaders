import type { Metadata } from "next";
import { Suspense } from "react";
import { ACCOUNT_COPY } from "@/components/account/account-copy";
import { AccountOrdersView } from "@/components/account/account-orders-view";
import { signOutCustomer } from "@/server/customer-auth/customer-auth.action";
import { requireCustomerPage } from "@/server/customer-auth/require-customer";
import { loadAccountOrders } from "./load-account-orders";

export const metadata: Metadata = { title: "My orders", robots: { index: false } };

/**
 * "My orders" (E07 spec A11, A13): a static heading, then the session read at request time
 * inside `<Suspense>` (A23) and the customer's own orders. A guest, or a browser holding only an
 * owner session, is sent to the customer sign-in page.
 */
export default function AccountOrdersPage() {
  return (
    <>
      <h1 className="text-3xl font-semibold tracking-tight">{ACCOUNT_COPY.ordersHeading}</h1>
      <Suspense
        fallback={
          <div aria-label="Loading your orders" className="h-32 animate-pulse rounded bg-muted" />
        }
      >
        <AccountOrders />
      </Suspense>
    </>
  );
}

async function AccountOrders() {
  const customer = await requireCustomerPage();
  const result = await loadAccountOrders(customer.id);
  return (
    <AccountOrdersView
      email={customer.email}
      signOutAction={signOutCustomer}
      list={result.kind === "ok" ? result.data : null}
    />
  );
}
