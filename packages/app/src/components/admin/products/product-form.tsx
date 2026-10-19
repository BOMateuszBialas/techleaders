"use client";

import { useActionState, type ReactNode } from "react";
import { IDLE_ACTION_STATE, type AdminFormAction } from "@/lib/action-state";
import {
  ProductFormView,
  type ProductCategoryOption,
  type ProductFormProduct,
} from "./product-form-view";

/**
 * Thin client wrapper (spec A15): it only connects the server action to `useActionState`
 * and renders the view, so it has no branches of its own.
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
