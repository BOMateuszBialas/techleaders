import Link from "next/link";
import { formatMoney, type PricedCart } from "@commerceos/core";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { buttonVariants } from "@/components/ui/button";
import { DrawerBody, DrawerFooter } from "@/components/ui/drawer";
import { Empty, EmptyContent, EmptyHeader, EmptyTitle } from "@/components/ui/empty";
import { ErrorState } from "@/components/ui/error-state";
import type { FormAction } from "@/lib/action-state";
import { CartChanges } from "./cart-changes";
import {
  CART_UNAVAILABLE_MESSAGE,
  CART_UNAVAILABLE_TITLE,
  CHECKOUT_LINK,
  EMPTY_CART_MESSAGE,
  PRICES_CONFIRMED_NOTE,
  SHOP_ALL_PRODUCTS_LINK,
  VIEW_FULL_CART_LINK,
} from "./cart-copy";
import { CartDrawerLine } from "./cart-drawer-line";

export type CartDrawerViewProps = {
  /** The priced cart, or `null` when it could not be read (the drawer says so). */
  cart: PricedCart | null;
  /** "Added to cart." after an add, shown here because the page behind is inert (spec A10). */
  notice: string | null;
  updateAction: FormAction;
  removeAction: FormAction;
  acceptAction: (formData: FormData) => Promise<void>;
};

/**
 * The drawer's content in one given state (storefront v2, Phase 2): the notice, the corrections
 * the cart needs (cart spec G12, G13), the lines, the empty state, and the footer with the
 * subtotal, "Checkout" (the only action-coloured control here, spec "Action colour") and "View
 * full cart". Read from the server's priced cart (A11). Hook-free: `CartDrawerLine` holds the
 * per-line forms; the title and the close button live in `CartDrawer`.
 */
export function CartDrawerView({
  cart,
  notice,
  updateAction,
  removeAction,
  acceptAction,
}: CartDrawerViewProps) {
  if (cart === null) {
    return (
      <DrawerBody>
        <ErrorState
          title={CART_UNAVAILABLE_TITLE}
          description={CART_UNAVAILABLE_MESSAGE}
          action={
            <Link href="/cart" className={buttonVariants({ variant: "outline" })}>
              {VIEW_FULL_CART_LINK}
            </Link>
          }
        />
      </DrawerBody>
    );
  }
  return (
    <>
      <DrawerBody>
        {notice ? (
          <Alert variant="success" role="status">
            <AlertDescription>{notice}</AlertDescription>
          </Alert>
        ) : null}
        {cart.changed ? <CartChanges notices={cart.notices} acceptAction={acceptAction} /> : null}
        {cart.subtotal === null ? (
          <Empty>
            <EmptyHeader>
              <EmptyTitle>{EMPTY_CART_MESSAGE}</EmptyTitle>
            </EmptyHeader>
            <EmptyContent>
              <Link href="/products" className={buttonVariants({ variant: "outline" })}>
                {SHOP_ALL_PRODUCTS_LINK}
              </Link>
            </EmptyContent>
          </Empty>
        ) : (
          <ul aria-label="Cart items" className="flex flex-col divide-y border-y">
            {cart.lines.map((line) => (
              <CartDrawerLine
                key={line.productId}
                line={line}
                updateAction={updateAction}
                removeAction={removeAction}
              />
            ))}
          </ul>
        )}
      </DrawerBody>
      {cart.subtotal === null ? null : (
        <DrawerFooter>
          <div className="flex items-baseline justify-between gap-related">
            <span>Subtotal</span>
            <span className="text-lg font-semibold" data-testid="cart-subtotal">
              {formatMoney(cart.subtotal)}
            </span>
          </div>
          <p className="text-sm text-muted-foreground">{PRICES_CONFIRMED_NOTE}</p>
          {/* Closed while the stored cart still needs the correction above (as on /cart). */}
          {cart.changed ? null : (
            <Link href="/checkout" className={buttonVariants({ variant: "action", size: "lg" })}>
              {CHECKOUT_LINK}
            </Link>
          )}
          <Link href="/cart" className="w-fit text-sm underline underline-offset-4">
            {VIEW_FULL_CART_LINK}
          </Link>
        </DrawerFooter>
      )}
    </>
  );
}
