"use client";

import { useActionState } from "react";
import { IDLE_ACTION_STATE, type FormAction } from "@/lib/action-state";
import { LookupFormView, PayFormView } from "./order-forms-view";

/** Thin client wrapper: `useActionState` plus the view, no branches. */
export function PayForm({ action, reference }: { action: FormAction; reference: string }) {
  const [state, formAction, pending] = useActionState(action, IDLE_ACTION_STATE);
  return <PayFormView action={formAction} state={state} pending={pending} reference={reference} />;
}

/** Thin client wrapper: `useActionState` plus the view, no branches. */
export function LookupForm({ action }: { action: FormAction }) {
  const [state, formAction, pending] = useActionState(action, IDLE_ACTION_STATE);
  return <LookupFormView action={formAction} state={state} pending={pending} />;
}
