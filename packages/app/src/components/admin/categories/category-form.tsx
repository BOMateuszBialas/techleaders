"use client";

import { useActionState } from "react";
import { IDLE_ACTION_STATE, type AdminFormAction } from "@/lib/action-state";
import { CategoryFormView, type CategoryFormCategory } from "./category-form-view";

/**
 * Thin client wrapper (spec A15): it only connects the server action to `useActionState`
 * and renders the view, so it has no branches of its own.
 */
export function CategoryForm({
  action,
  category,
}: {
  action: AdminFormAction;
  category?: CategoryFormCategory;
}) {
  const [state, formAction, pending] = useActionState(action, IDLE_ACTION_STATE);
  return (
    <CategoryFormView action={formAction} state={state} pending={pending} category={category} />
  );
}
