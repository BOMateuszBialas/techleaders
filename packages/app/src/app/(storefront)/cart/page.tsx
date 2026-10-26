import type { Metadata } from "next";
import { connection } from "next/server";
import { Suspense } from "react";
import { CART_HEADING } from "@/components/cart/cart-copy";
import { CartPageSkeleton, CartPageUnavailable } from "@/components/cart/cart-page-states";
import { CartSummary } from "@/components/cart/cart-summary";
import { acceptCartChanges, removeCartLine, updateCartLine } from "@/server/cart/cart.action";
import { loadCartPage } from "./load-cart-page";

export const metadata: Metadata = { title: "Cart" };

/** The shopper's cart (cart spec, UI/UX "/cart"). Read at request time inside `<Suspense>`. */
export default function CartPage() {
  return (
    <>
      <h1 className="text-3xl font-semibold tracking-tight">{CART_HEADING}</h1>
      <Suspense fallback={<CartPageSkeleton />}>
        <CartContents />
      </Suspense>
    </>
  );
}

async function CartContents() {
  await connection();
  const result = await loadCartPage();
  if (result.kind !== "ok") return <CartPageUnavailable />;
  return (
    <CartSummary
      cart={result.data}
      updateAction={updateCartLine}
      removeAction={removeCartLine}
      acceptAction={acceptCartChanges}
    />
  );
}
