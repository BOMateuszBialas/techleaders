"use client";

import { useActionState } from "react";
import { IDLE_ACTION_STATE, type AdminFormAction } from "@/lib/action-state";
import { PublishControlView, type PublishControlViewProps } from "./publish-control-view";

/** Thin client wrapper (spec A15): `useActionState` plus the view, no branches. */
export function PublishControl({
  action,
  product,
}: {
  action: AdminFormAction;
  product: PublishControlViewProps["product"];
}) {
  const [state, formAction, pending] = useActionState(action, IDLE_ACTION_STATE);
  return (
    <PublishControlView action={formAction} state={state} pending={pending} product={product} />
  );
}
