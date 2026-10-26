import Link from "next/link";
import { formatMoney, type PricedCart } from "@commerceos/core";
import type { FormAction } from "@/lib/action-state";
import { Empty, EmptyContent, EmptyHeader, EmptyTitle } from "@/components/ui/empty";
import { buttonVariants } from "@/components/ui/button";
import { CartChanges } from "./cart-changes";
import {
  BROWSE_ALL_PRODUCTS_LINK,
  CHECKOUT_LINK,
  COOKIES_REQUIRED_NOTE,
  EMPTY_CART_MESSAGE,
  PRICES_CONFIRMED_NOTE,
} from "./cart-copy";
import { CartLineItem } from "./cart-line-item";

type CartSummaryProps = {
  cart: PricedCart;
  updateAction: FormAction;
  removeAction: FormAction;
  acceptAction: (formData: FormData) => Promise<void>;
};

/**
 * The cart page's content (cart spec, UI/UX "/cart"): what changed since the last visit
 * (G12, G13) with the button that stores the correction, the lines, the subtotal from server
 * prices, and the link to the checkout.
 */
export function CartSummary({ cart, updateAction, removeAction, acceptAction }: CartSummaryProps) {
  return (
    <div className="flex flex-col gap-6">
      {cart.changed ? <CartChanges notices={cart.notices} acceptAction={acceptAction} /> : null}
      {cart.subtotal === null ? (
        <Empty>
          <EmptyHeader>
            <EmptyTitle>{EMPTY_CART_MESSAGE}</EmptyTitle>
          </EmptyHeader>
          <EmptyContent>
            <Link href="/products" className={buttonVariants({ variant: "outline" })}>
              {BROWSE_ALL_PRODUCTS_LINK}
            </Link>
          </EmptyContent>
        </Empty>
      ) : (
        <>
          <ul aria-label="Cart items" className="flex flex-col divide-y border-y">
            {cart.lines.map((line) => (
              <CartLineItem
                key={line.productId}
                line={line}
                updateAction={updateAction}
                removeAction={removeAction}
              />
            ))}
          </ul>
          <div className="flex flex-col items-end gap-2">
            <p className="text-lg">
              Subtotal:{" "}
              <span className="font-semibold" data-testid="cart-subtotal">
                {formatMoney(cart.subtotal)}
              </span>
            </p>
            <p className="text-sm text-muted-foreground">{PRICES_CONFIRMED_NOTE}</p>
            {/* Closed while the stored cart still needs the correction above. */}
            {cart.changed ? null : (
              <Link href="/checkout" className={buttonVariants({ variant: "action" })}>
                {CHECKOUT_LINK}
              </Link>
            )}
          </div>
        </>
      )}
      <p className="text-xs text-muted-foreground">{COOKIES_REQUIRED_NOTE}</p>
    </div>
  );
}
