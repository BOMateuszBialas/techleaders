"use server";

import { isStaleStockError } from "@commerceos/core";
import {
  STOCK_FORM_OUTDATED_MESSAGE,
  stockChangedMessage,
} from "@/components/admin/products/stock-copy";
import type { ActionState } from "@/lib/action-state";
import { readFormValue, readFormValues } from "./form-data";
import { runAdminAction } from "./run-admin-action";

// Every export of a "use server" file is a public POST endpoint. Each one runs through
// runAdminAction, which calls requireAdmin() before the handler (unit-tested per export).

const STOCK_FIELDS = ["expectedQuantity", "newQuantity"];

/**
 * Sets a product's stock (admin catalog spec, Phase 2, API Contracts `adjustStock`). The use
 * case validates the quantities and applies the change only while the stored stock still
 * equals the one the form showed. When it does not (stale), the form is reset to the current
 * quantity: both returned values become N, and the message says so. A broken hidden
 * `expectedQuantity` becomes a form-level "reload" message (`withVisibleErrors`).
 */
export async function adjustStock(
  _previous: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const productId = readFormValue(formData, "productId");
  const values = readFormValues(formData, STOCK_FIELDS);
  const state = await runAdminAction(
    "inventory.stock.adjust",
    values,
    async ({ adjustStockUseCase }) => {
      const result = await adjustStockUseCase
        .execute({
          productId,
          expectedQuantity: values.expectedQuantity,
          newQuantity: values.newQuantity,
        })
        .catch((error: unknown) => {
          if (isStaleStockError(error)) {
            values.expectedQuantity = String(error.currentQuantity);
            values.newQuantity = String(error.currentQuantity);
          }
          throw error;
        });
      return {
        event:
          result.outcome === "updated" ? "inventory.stock.adjusted" : "inventory.stock.unchanged",
        id: result.product.id,
        message: stockChangedMessage(result),
      };
    },
  );
  return withVisibleErrors(state, readFormValue(formData, "newQuantity"));
}

/**
 * `expectedQuantity` is a hidden input, so an error on it would leave "Check the highlighted
 * fields." with nothing highlighted, and "Current stock" would echo the posted text (#43).
 * Such a state says to reload instead and drops the posted quantity, so the panel falls back
 * to the stored stock. A visible field's error stays under its field.
 */
function withVisibleErrors(state: ActionState, newQuantity: string): ActionState {
  const { expectedQuantity, ...visibleErrors } = state.fieldErrors ?? {};
  if (!expectedQuantity) return state;
  return {
    status: "error",
    message: STOCK_FORM_OUTDATED_MESSAGE,
    ...(Object.keys(visibleErrors).length > 0 ? { fieldErrors: visibleErrors } : {}),
    values: { newQuantity },
  };
}
