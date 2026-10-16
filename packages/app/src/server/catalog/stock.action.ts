"use server";

import { isStaleStockError } from "@commerceos/core";
import { stockChangedMessage } from "@/components/admin/products/stock-copy";
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
 * quantity: both returned values become N, and the message says so.
 */
export async function adjustStock(
  _previous: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const productId = readFormValue(formData, "productId");
  const values = readFormValues(formData, STOCK_FIELDS);
  return runAdminAction("inventory.stock.adjust", values, async ({ adjustStockUseCase }) => {
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
  });
}
