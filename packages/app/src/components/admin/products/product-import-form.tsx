"use client";

import { useActionState } from "react";
import type { ProductImportState } from "./product-import-copy";
import { ProductImportView } from "./product-import-view";

const IDLE_IMPORT_STATE: ProductImportState = { status: "idle" };

/** Thin client wrapper: `useActionState` plus the view, no branches. */
export function ProductImportForm({
  action,
}: {
  action: (previous: ProductImportState, formData: FormData) => Promise<ProductImportState>;
}) {
  const [state, formAction, pending] = useActionState(action, IDLE_IMPORT_STATE);
  return <ProductImportView action={formAction} state={state} pending={pending} />;
}
