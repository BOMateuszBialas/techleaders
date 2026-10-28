"use client";

import { useActionState, useEffect, type ReactNode } from "react";
import { IDLE_ACTION_STATE, type ActionState, type AdminFormAction } from "@/lib/action-state";
import {
  PRODUCT_FORM_ID,
  ProductFormView,
  type ProductCategoryOption,
  type ProductFormProduct,
} from "./product-form-view";

/**
 * The effect `ProductForm` runs after each result: after a failed submit, focus the first field
 * with `aria-invalid="true"` inside the product form (retrofit Phase 3, A-2; tokeny.md §7 rule 13).
 * Same approach as the checkout (`checkout/first-invalid-field.ts`): the logic lives here, where
 * unit tests reach it; the wrapper only wires it to `useEffect`.
 */
export function focusFirstInvalidProductField(state: ActionState): () => void {
  return () => {
    if (state.status !== "error") return;
    globalThis.document
      .querySelector<HTMLElement>(`#${PRODUCT_FORM_ID} [aria-invalid="true"]`)
      ?.focus();
  };
}

/**
 * Thin client wrapper (spec A15): it only connects the server action to `useActionState`,
 * renders the view and runs the focus step after a failed submit (A-2).
 */
export function ProductForm({
  action,
  categories,
  product,
  descriptionDraft,
}: {
  action: AdminFormAction;
  categories: ProductCategoryOption[];
  product?: ProductFormProduct;
  descriptionDraft?: ReactNode;
}) {
  const [state, formAction, pending] = useActionState(action, IDLE_ACTION_STATE);
  // The effect reads only `state` (the form id is a module constant). The rule cannot see through
  // the returned function, so it is named here: the effect re-runs on each result.
  // eslint-disable-next-line react-hooks/exhaustive-deps -- deps are `state` only (see above)
  useEffect(focusFirstInvalidProductField(state), [state]);
  return (
    <ProductFormView
      action={formAction}
      state={state}
      pending={pending}
      categories={categories}
      product={product}
      descriptionDraft={descriptionDraft}
    />
  );
}
