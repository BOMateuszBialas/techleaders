"use client";

import { useActionState, useEffect } from "react";
import { IDLE_ACTION_STATE, type FormAction } from "@/lib/action-state";
import { focusFirstInvalidEffect } from "./first-invalid-field";
import {
  CHECKOUT_FIELD_NAMES,
  CheckoutFormView,
  type CheckoutFormContext,
} from "./checkout-form-view";

/**
 * Thin client wrapper: `useActionState` plus the view, no branches of its own. While a submit is
 * pending the button is disabled (a double-click guard on top of the idempotency key, spec UI/UX).
 * After a result with field errors the focus moves to the first invalid field (retrofit Phase 2,
 * C3); the logic is in `first-invalid-field.ts`, which the unit tests cover.
 */
export function CheckoutForm({ action, ...context }: { action: FormAction } & CheckoutFormContext) {
  const [state, formAction, pending] = useActionState(action, IDLE_ACTION_STATE);
  // The effect reads only `state` (the field names are a module constant). The rule cannot see
  // through the returned function, so it is named here: the effect re-runs on each result.
  // eslint-disable-next-line react-hooks/exhaustive-deps -- deps are `state` only (see above)
  useEffect(focusFirstInvalidEffect(state, CHECKOUT_FIELD_NAMES), [state]);
  return <CheckoutFormView action={formAction} state={state} pending={pending} {...context} />;
}
