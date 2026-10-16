"use client";

import { useActionState } from "react";
import { IDLE_ACTION_STATE, type FormAction } from "@/lib/action-state";
import { AddToCartView, type AddToCartViewProps } from "./add-to-cart-view";

/** Thin client wrapper: `useActionState` plus the view, no branches. */
export function AddToCart({
  action,
  ...props
}: { action: FormAction } & Pick<AddToCartViewProps, "productId" | "available" | "withQuantity">) {
  const [state, formAction, pending] = useActionState(action, IDLE_ACTION_STATE);
  return <AddToCartView action={formAction} state={state} pending={pending} {...props} />;
}
