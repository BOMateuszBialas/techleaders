"use client";

import { useActionState } from "react";
import type { ProductImportState } from "./product-import-copy";
import { ProductImportView } from "./product-import-view";

const IDLE_IMPORT_STATE: ProductImportState = { status: "idle" };

type ImportAction = (
  previous: ProductImportState,
  formData: FormData,
) => Promise<ProductImportState>;

/**
 * The server action never reads the previous state, and `useActionState` would post it
 * back (the preview rows and the checked text) next to the form's own `csv` field. Sending
 * the idle state instead keeps the confirm request within the server-action body limit
 * (spec A7).
 */
export function withoutPreviousState(action: ImportAction): ImportAction {
  return (_previous, formData) => action(IDLE_IMPORT_STATE, formData);
}

/** Thin client wrapper: `useActionState` plus the view, no branches. */
export function ProductImportForm({ action }: { action: ImportAction }) {
  const [state, formAction, pending] = useActionState(
    withoutPreviousState(action),
    IDLE_IMPORT_STATE,
  );
  return <ProductImportView action={formAction} state={state} pending={pending} />;
}
