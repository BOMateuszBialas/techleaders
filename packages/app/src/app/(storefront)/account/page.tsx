import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import { CUSTOMER_HOME } from "@/server/customer-auth/customer-auth-errors";
import { requireCustomerPage } from "@/server/customer-auth/require-customer";

export const metadata: Metadata = { title: "Account", robots: { index: false } };

/** `/account` (spec A11): the guard first (sign-in for a guest), then "My orders". */
export default function AccountPage() {
  return (
    <Suspense fallback={null}>
      <AccountRedirect />
    </Suspense>
  );
}

async function AccountRedirect(): Promise<null> {
  await requireCustomerPage();
  redirect(CUSTOMER_HOME);
}
