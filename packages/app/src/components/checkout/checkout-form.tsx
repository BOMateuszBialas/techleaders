"use client";

import { useActionState } from "react";
import { IDLE_ACTION_STATE, type FormAction } from "@/lib/action-state";
import { CheckoutFormView, type CheckoutFormContext } from "./checkout-form-view";

/**
 * Thin client wrapper: `useActionState` plus the view, no branches. While a submit is pending
 * the button is disabled (a double-click guard on top of the idempotency key, spec UI/UX).
 */
export function CheckoutForm({ action, ...context }: { action: FormAction } & CheckoutFormContext) {
  const [state, formAction, pending] = useActionState(action, IDLE_ACTION_STATE);
  return <CheckoutFormView action={formAction} state={state} pending={pending} {...context} />;
}
