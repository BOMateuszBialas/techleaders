import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { connection } from "next/server";
import { Suspense } from "react";
import { money } from "@commerceos/core";
import { CartChanges } from "@/components/cart/cart-changes";
import { CHECKOUT_HEADING, REVIEW_CART_LINK } from "@/components/checkout/checkout-copy";
import { CheckoutForm } from "@/components/checkout/checkout-form";
import { checkoutModeFor } from "@/components/checkout/checkout-mode";
import {
  CheckoutPageSkeleton,
  CheckoutPageUnavailable,
} from "@/components/checkout/checkout-page-states";
import { OrderSummary } from "@/components/checkout/order-summary";
import { TextLink } from "@/components/ui/text-link";
import { acceptCartChanges } from "@/server/cart/cart.action";
import { getCurrentCustomerId } from "@/server/customer-auth/require-customer";
import { placeOrder } from "@/server/orders/order.action";
import { loadCheckoutPage } from "./load-checkout-page";

export const metadata: Metadata = { title: "Checkout", robots: { index: false } };

/**
 * Checkout (cart spec, Phase 2): server prices, then the demo payment step. The form shows the
 * mode the order will follow (E07 spec A24): "Buying as <email>" for a confirmed customer
 * session, otherwise guest mode; the session is read per request inside `<Suspense>` (A23).
 */
export default function CheckoutPage() {
  return (
    <>
      <h1 className="text-3xl font-semibold tracking-tight">{CHECKOUT_HEADING}</h1>
      <Suspense fallback={<CheckoutPageSkeleton />}>
        <CheckoutContents />
      </Suspense>
    </>
  );
}

async function CheckoutContents() {
  await connection();
  const result = await loadCheckoutPage();
  if (result.kind !== "ok") return <CheckoutPageUnavailable />;
  const { cart, idempotencyKey, cartFingerprint } = result.data;
  // Control flow after the loader mapped every error (never inside a try block).
  if (cart.subtotal === null && !cart.changed) redirect("/cart");

  if (cart.changed || cart.subtotal === null) {
    return (
      <div className="flex flex-col gap-4">
        <CartChanges notices={cart.notices} acceptAction={acceptCartChanges} />
        <TextLink href="/cart" variant="standalone">
          {REVIEW_CART_LINK}
        </TextLink>
      </div>
    );
  }

  // What the page shows is what the order becomes: placeOrder reads the session again (A24).
  const mode = checkoutModeFor(await getCurrentCustomerId());
  return (
    <div className="grid gap-8 md:grid-cols-checkout">
      <CheckoutForm
        action={placeOrder}
        idempotencyKey={idempotencyKey}
        cartFingerprint={cartFingerprint}
        expectedTotalMinor={cart.subtotal.amountMinor}
        mode={mode}
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
