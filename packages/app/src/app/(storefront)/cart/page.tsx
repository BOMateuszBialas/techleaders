import type { Metadata } from "next";
import { connection } from "next/server";
import { Suspense } from "react";
import { CART_HEADING, CART_UNAVAILABLE_MESSAGE } from "@/components/cart/cart-copy";
import { CartSummary } from "@/components/cart/cart-summary";
import { acceptCartChanges, removeCartLine, updateCartLine } from "@/server/cart/cart.action";
import { loadCartPage } from "./load-cart-page";

export const metadata: Metadata = { title: "Cart" };

/** The shopper's cart (cart spec, UI/UX "/cart"). Read at request time inside `<Suspense>`. */
export default function CartPage() {
  return (
    <>
      <h1 className="text-3xl font-semibold tracking-tight">{CART_HEADING}</h1>
      <Suspense fallback={<CartSkeleton />}>
        <CartContents />
      </Suspense>
    </>
  );
}

async function CartContents() {
  await connection();
  const result = await loadCartPage();
  if (result.kind !== "ok") {
    return (
      <p role="alert" className="text-sm text-destructive">
        {CART_UNAVAILABLE_MESSAGE}
      </p>
    );
  }
  return (
    <CartSummary
      cart={result.data}
      updateAction={updateCartLine}
      removeAction={removeCartLine}
      acceptAction={acceptCartChanges}
    />
  );
}

function CartSkeleton() {
  return (
    <div aria-label="Loading cart" className="flex flex-col gap-3">
      <div className="h-16 animate-pulse rounded bg-muted" />
      <div className="h-16 animate-pulse rounded bg-muted" />
    </div>
  );
}
