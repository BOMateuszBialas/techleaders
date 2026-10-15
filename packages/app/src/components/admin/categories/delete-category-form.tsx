"use client";

import { useActionState } from "react";
import { IDLE_ACTION_STATE, type AdminFormAction } from "@/lib/action-state";
import { DeleteCategoryView, type DeleteCategoryViewProps } from "./delete-category-view";

/** Thin client wrapper (spec A15): `useActionState` plus the view, no branches. */
export function DeleteCategoryForm({
  action,
  category,
}: {
  action: AdminFormAction;
  category: DeleteCategoryViewProps["category"];
}) {
  const [state, formAction, pending] = useActionState(action, IDLE_ACTION_STATE);
  return (
    <DeleteCategoryView action={formAction} state={state} pending={pending} category={category} />
  );
}
