import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { connection } from "next/server";
import { Suspense } from "react";
import { money } from "@commerceos/core";
import { CheckoutAccountNote } from "@/components/account/checkout-account-note";
import { CartChanges } from "@/components/cart/cart-changes";
import {
  CHECKOUT_HEADING,
  CHECKOUT_UNAVAILABLE_MESSAGE,
  REVIEW_CART_LINK,
} from "@/components/checkout/checkout-copy";
import { CheckoutForm } from "@/components/checkout/checkout-form";
import { OrderSummary } from "@/components/checkout/order-summary";
import { acceptCartChanges } from "@/server/cart/cart.action";
import { isCustomerSignedIn } from "@/server/customer-auth/require-customer";
import { placeOrder } from "@/server/orders/order.action";
import { loadCheckoutPage } from "./load-checkout-page";

export const metadata: Metadata = { title: "Checkout", robots: { index: false } };

/** Guest checkout (cart spec, Phase 2): server prices, then the demo payment step. */
export default function CheckoutPage() {
  return (
    <>
      <h1 className="text-3xl font-semibold tracking-tight">{CHECKOUT_HEADING}</h1>
      <Suspense fallback={null}>
        <LoadedCheckoutAccountNote />
      </Suspense>
      <Suspense
        fallback={
          <div aria-label="Loading checkout" className="h-64 animate-pulse rounded bg-muted" />
        }
      >
        <CheckoutContents />
      </Suspense>
    </>
  );
}

/** "Sign in for order history" for a signed-out shopper (E07 spec A16), read per request (A23). */
async function LoadedCheckoutAccountNote() {
  return <CheckoutAccountNote signedIn={await isCustomerSignedIn()} />;
}

async function CheckoutContents() {
  await connection();
  const result = await loadCheckoutPage();
  if (result.kind !== "ok") {
    return (
      <p role="alert" className="text-sm text-destructive">
        {CHECKOUT_UNAVAILABLE_MESSAGE}
      </p>
    );
  }
  const { cart, idempotencyKey, cartFingerprint } = result.data;
  // Control flow after the loader mapped every error (never inside a try block).
  if (cart.subtotal === null && !cart.changed) redirect("/cart");

  if (cart.changed || cart.subtotal === null) {
    return (
      <div className="flex flex-col gap-4">
        <CartChanges notices={cart.notices} acceptAction={acceptCartChanges} />
        <Link href="/cart" className="w-fit text-sm underline underline-offset-4">
          {REVIEW_CART_LINK}
        </Link>
      </div>
    );
  }

  return (
    <div className="grid gap-8 md:grid-cols-[1fr_22rem]">
      <CheckoutForm
        action={placeOrder}
        idempotencyKey={idempotencyKey}
        cartFingerprint={cartFingerprint}
        expectedTotalMinor={cart.subtotal.amountMinor}
      />
      <OrderSummary
        items={cart.lines}
        subtotal={cart.subtotal}
        shipping={money(0, cart.subtotal.currency)}
        total={cart.subtotal}
      />
    </div>
  );
}
