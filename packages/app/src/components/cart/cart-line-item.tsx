"use client";

import type { PricedCartLine } from "@commerceos/core";
import { useActionState } from "react";
import { IDLE_ACTION_STATE, type FormAction } from "@/lib/action-state";
import { CartLineView } from "./cart-line-view";

/** Thin client wrapper: one `useActionState` per form plus the view, no branches. */
export function CartLineItem({
  line,
  updateAction,
  removeAction,
}: {
  line: PricedCartLine;
  updateAction: FormAction;
  removeAction: FormAction;
}) {
  const [updateState, update, updating] = useActionState(updateAction, IDLE_ACTION_STATE);
  const [removeState, remove, removing] = useActionState(removeAction, IDLE_ACTION_STATE);
  return (
    <CartLineView
      line={line}
      update={{ action: update, state: updateState, pending: updating }}
      remove={{ action: remove, state: removeState, pending: removing }}
    />
  );
}
