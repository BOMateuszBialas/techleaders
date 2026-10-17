"use server";

import { ValidationError, isStaleOrderStatusError } from "@commerceos/core";
import { refresh } from "next/cache";
import {
  CONFIRM_REQUIRED_MESSAGE,
  statusChangedMessage,
} from "@/components/admin/orders/order-copy";
import type { ActionState } from "@/lib/action-state";
import { readFormValue } from "../catalog/form-data";
import { runAdminAction } from "../catalog/run-admin-action";

// Every export of a "use server" file is a public POST endpoint. Each one runs through
// runAdminAction, which calls requireAdmin() before the handler (unit-tested per export).

/** Targets with an effect beyond the status: their form carries a required confirmation tick. */
const CONFIRMED_TARGETS: readonly string[] = ["cancelled", "refunded"];

/**
 * Moves an order to another status (orders spec, API Contracts `changeOrderStatus`). The use
 * case validates the pair against the transition table and applies it only while the order is
 * still in `from`; a cancel returns the stock in the same transaction (and `runAdminAction`
 * updates the catalog cache tag, so the storefront sees it). A cancel or refund without its
 * confirmation tick is refused before the use case runs.
 *
 * When the order changed meanwhile (stale), nothing was written, so `runAdminAction` does not
 * refresh; this action refreshes the page itself, so it shows the current status and only the
 * buttons that status allows. Only the order id is logged (never the reference, A16).
 */
export async function changeOrderStatus(
  _previous: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const orderId = readFormValue(formData, "orderId");
  const from = readFormValue(formData, "from");
  const to = readFormValue(formData, "to");
  let stale = false;
  const state = await runAdminAction(
    "orders.status.change",
    {},
    async ({ changeOrderStatusUseCase }) => {
      if (CONFIRMED_TARGETS.includes(to) && readFormValue(formData, "confirm") !== "yes") {
        throw new ValidationError(CONFIRM_REQUIRED_MESSAGE);
      }
      const result = await changeOrderStatusUseCase
        .execute({ orderId, from, to })
        .catch((error: unknown) => {
          stale = isStaleOrderStatusError(error);
          throw error;
        });
      return {
        event: "orders.status.changed",
        id: result.order.id,
        message: statusChangedMessage(result),
      };
    },
  );
  if (stale) refresh();
  return state;
}
