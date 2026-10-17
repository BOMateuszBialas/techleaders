"use client";

import { useActionState } from "react";
import { IDLE_ACTION_STATE, type AdminFormAction } from "@/lib/action-state";
import { OrderStatusFormView, type OrderStatusPanelOrder } from "./order-status-form-view";

/** Thin client wrapper: `useActionState` plus the view, no branches. */
export function OrderStatusForm({
  action,
  order,
}: {
  action: AdminFormAction;
  order: OrderStatusPanelOrder;
}) {
  const [state, formAction, pending] = useActionState(action, IDLE_ACTION_STATE);
  return <OrderStatusFormView action={formAction} state={state} pending={pending} order={order} />;
}
