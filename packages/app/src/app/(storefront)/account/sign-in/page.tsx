import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import {
  CustomerAuthCard,
  CustomerAuthCardSkeleton,
} from "@/components/account/customer-auth-card";
import { signInCustomer } from "@/server/customer-auth/customer-auth.action";
import {
  customerReturnPath,
  customerSignInErrorMessage,
  isCheckoutReturn,
} from "@/server/customer-auth/customer-auth-errors";
import { getCurrentCustomerId } from "@/server/customer-auth/require-customer";

export const metadata: Metadata = { title: "Sign in", robots: { index: false } };

/**
 * Customer sign-in (E07 spec, UI/UX). The form renders inside `<Suspense>` with the request's
 * error and `from=checkout` code; the fallback is a placeholder, never a form without `from`. A
 * signed-in customer is sent on to "My orders" (or back to checkout).
 */
export default function CustomerSignInPage({ searchParams }: PageProps<"/account/sign-in">) {
  return (
    <Suspense fallback={<CustomerAuthCardSkeleton />}>
      <LoadedSignIn searchParams={searchParams} />
    </Suspense>
  );
}

async function LoadedSignIn({ searchParams }: Pick<PageProps<"/account/sign-in">, "searchParams">) {
  const { error, from } = await searchParams;
  // A session-read failure keeps the form (A24); the redirect runs outside any try block.
  if ((await getCurrentCustomerId()).status === "customer") redirect(customerReturnPath(from));
  return (
    <CustomerAuthCard
      mode="sign-in"
      action={signInCustomer}
      error={customerSignInErrorMessage(error)}
      fromCheckout={isCheckoutReturn(from)}
    />
  );
}
