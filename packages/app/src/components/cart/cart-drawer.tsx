"use client";

import type { PricedCart } from "@commerceos/core";
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle } from "@/components/ui/drawer";
import type { FormAction } from "@/lib/action-state";
import { CART_HEADING } from "./cart-copy";
import { useCartDrawer } from "./cart-drawer-context";
import { closeDrawerOnRequest, drawerTitle } from "./cart-drawer-state";
import { CartDrawerView } from "./cart-drawer-view";

export type CartDrawerProps = {
  /** The priced cart read on the server (A11); `null` when it could not be read. */
  cart: PricedCart | null;
  updateAction: FormAction;
  removeAction: FormAction;
  acceptAction: (formData: FormData) => Promise<void>;
};

/**
 * The cart drawer (storefront v2, Phase 2): a client wrapper that connects the shared drawer state
 * to the design-system `Drawer` and renders the header (title "Your cart (n)") and the view. It
 * renders nothing outside the provider. Focus returns to the trigger on close (`finalFocus`).
 */
export function CartDrawer({ cart, updateAction, removeAction, acceptAction }: CartDrawerProps) {
  const drawer = useCartDrawer();
  if (!drawer) return null;
  const { state, dispatch } = drawer;
  return (
    <Drawer open={state.open} onOpenChange={closeDrawerOnRequest(dispatch)}>
      <DrawerContent finalFocus={state.returnFocusTo}>
        <DrawerHeader>
          <DrawerTitle>{cart ? drawerTitle(cart.itemCount) : CART_HEADING}</DrawerTitle>
        </DrawerHeader>
        <CartDrawerView
          cart={cart}
          notice={state.notice}
          updateAction={updateAction}
          removeAction={removeAction}
          acceptAction={acceptAction}
        />
      </DrawerContent>
    </Drawer>
  );
}
