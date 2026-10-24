import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import { CustomerAuthCard } from "@/components/account/customer-auth-card";
import { signInCustomer } from "@/server/customer-auth/customer-auth.action";
import {
  customerReturnPath,
  customerSignInErrorMessage,
  isCheckoutReturn,
} from "@/server/customer-auth/customer-auth-errors";
import { getCurrentCustomerId } from "@/server/customer-auth/require-customer";

export const metadata: Metadata = { title: "Sign in", robots: { index: false } };

/**
 * Customer sign-in (E07 spec, UI/UX). The card first renders statically; the error and the
 * `from=checkout` code come from the request inside `<Suspense>`. A signed-in customer is sent on
 * to "My orders" (or back to checkout).
 */
export default function CustomerSignInPage({ searchParams }: PageProps<"/account/sign-in">) {
  return (
    <Suspense
      fallback={
        <CustomerAuthCard
          mode="sign-in"
          action={signInCustomer}
          error={null}
          fromCheckout={false}
        />
      }
    >
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
