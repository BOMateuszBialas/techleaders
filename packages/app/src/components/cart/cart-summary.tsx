import Link from "next/link";
import { formatMoney, type PricedCart } from "@commerceos/core";
import type { FormAction } from "@/lib/action-state";
import {
  CHECKOUT_COMING_SOON,
  COOKIES_REQUIRED_NOTE,
  EMPTY_CART_MESSAGE,
  PRICES_CONFIRMED_NOTE,
} from "./cart-copy";
import { CartLineItem } from "./cart-line-item";

type CartSummaryProps = {
  cart: PricedCart;
  updateAction: FormAction;
  removeAction: FormAction;
};

/**
 * The cart page's content (cart spec, UI/UX "/cart"): what changed since the last visit
 * (G12, G13), the lines, the subtotal from server prices, and the checkout entry point. Until
 * the checkout ships (PR 2) the entry point says it is coming soon instead of a dead button.
 */
export function CartSummary({ cart, updateAction, removeAction }: CartSummaryProps) {
  return (
    <div className="flex flex-col gap-6">
      {cart.notices.length > 0 ? (
        <ul role="status" className="flex flex-col gap-1 rounded-md border bg-muted p-3 text-sm">
          {cart.notices.map((notice) => (
            <li key={notice}>{notice}</li>
          ))}
        </ul>
      ) : null}
      {cart.subtotal === null ? (
        <div className="flex flex-col gap-2">
          <p>{EMPTY_CART_MESSAGE}</p>
          <Link href="/products" className="w-fit text-sm underline underline-offset-4">
            Browse all products
          </Link>
        </div>
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
            <p className="text-sm font-medium">{CHECKOUT_COMING_SOON}</p>
          </div>
        </>
      )}
      <p className="text-xs text-muted-foreground">{COOKIES_REQUIRED_NOTE}</p>
    </div>
  );
}
