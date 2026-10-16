"use client";

import { useActionState } from "react";
import { IDLE_ACTION_STATE, type AdminFormAction } from "@/lib/action-state";
import type { StockHistoryRow } from "./stock-copy";
import { StockPanelView, type StockPanelProduct } from "./stock-panel-view";

/** Thin client wrapper (spec A15): `useActionState` plus the view, no branches. */
export function StockPanel({
  action,
  product,
  history,
}: {
  action: AdminFormAction;
  product: StockPanelProduct;
  history: StockHistoryRow[];
}) {
  const [state, formAction, pending] = useActionState(action, IDLE_ACTION_STATE);
  return (
    <StockPanelView
      action={formAction}
      state={state}
      pending={pending}
      product={product}
      history={history}
    />
  );
}
