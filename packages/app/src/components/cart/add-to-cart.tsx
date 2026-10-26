"use client";

import { useActionState } from "react";
import { IDLE_ACTION_STATE, type FormAction } from "@/lib/action-state";
import { AddToCartView, type AddToCartViewProps } from "./add-to-cart-view";
import { useCartDrawer } from "./cart-drawer-context";
import { openDrawerAfterAdd } from "./cart-drawer-state";

/**
 * Thin client wrapper: `useActionState` plus the view, no branches of its own. Inside the storefront
 * a successful add opens the cart drawer (storefront v2, Q6); without the provider the form only
 * shows its own result.
 */
export function AddToCart({
  action,
  ...props
}: { action: FormAction } & Pick<
  AddToCartViewProps,
  "productId" | "available" | "withQuantity" | "variant" | "size"
>) {
  const drawer = useCartDrawer();
  const [state, formAction, pending] = useActionState(
    drawer ? openDrawerAfterAdd(action, drawer.dispatch) : action,
    IDLE_ACTION_STATE,
  );
  return <AddToCartView action={formAction} state={state} pending={pending} {...props} />;
}
