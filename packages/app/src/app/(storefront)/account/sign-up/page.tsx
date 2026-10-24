import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import {
  CustomerAuthCard,
  CustomerAuthCardSkeleton,
} from "@/components/account/customer-auth-card";
import { signUpCustomer } from "@/server/customer-auth/customer-auth.action";
import {
  customerReturnPath,
  customerSignUpErrorMessage,
  isCheckoutReturn,
} from "@/server/customer-auth/customer-auth-errors";
import { getCurrentCustomerId } from "@/server/customer-auth/require-customer";

export const metadata: Metadata = { title: "Create an account", robots: { index: false } };

/**
 * Customer sign-up (E07 spec, UI/UX): email and password only (A7). The form renders inside
 * `<Suspense>` with the request's error and `from=checkout` code; the fallback is a placeholder,
 * never a form without `from`.
 * A signed-in customer is sent on to "My orders" (or back to checkout).
 */
export default function CustomerSignUpPage({ searchParams }: PageProps<"/account/sign-up">) {
  return (
    <Suspense fallback={<CustomerAuthCardSkeleton />}>
      <LoadedSignUp searchParams={searchParams} />
    </Suspense>
  );
}

async function LoadedSignUp({ searchParams }: Pick<PageProps<"/account/sign-up">, "searchParams">) {
  const { error, from } = await searchParams;
  // A session-read failure keeps the form (A24); the redirect runs outside any try block.
  if ((await getCurrentCustomerId()).status === "customer") redirect(customerReturnPath(from));
  return (
    <CustomerAuthCard
      mode="sign-up"
      action={signUpCustomer}
      error={customerSignUpErrorMessage(error)}
      fromCheckout={isCheckoutReturn(from)}
    />
  );
}
