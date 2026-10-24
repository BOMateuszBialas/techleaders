"use server";

import {
  CHECKOUT_FORM_FIELDS,
  ConflictError,
  ValidationError,
  normalizeOrderReference,
} from "@commerceos/core";
import { headers } from "next/headers";
import type { ActionState } from "@/lib/action-state";
import { readCartLines, writeCartLines } from "../cart/cart-cookie";
import { readFormValue, readFormValues } from "../catalog/form-data";
import { getCurrentCustomerId, toOrderViewer } from "../customer-auth/require-customer";
import { getEnv } from "../env";
import { runAction } from "../http/run-action";
import { TOO_MANY_LOOKUPS_MESSAGE, consumeOrderLookup } from "./order-lookup-limit";
import { REFERENCE_FORMAT_MESSAGE, orderPaths } from "./order-paths";

// Every export of a "use server" file is a public POST endpoint. These are shopper actions:
// anonymous by design (guest checkout), so each runs through runAction. Lines and prices never
// come from the form: the lines are the caller's cart cookie, priced by the server.

/**
 * Places the order (cart spec, API Contracts `placeOrder`): validates the form, re-prices the
 * cookie's lines, decrements stock in one transaction, clears the cart and goes to the demo
 * payment page. On a failure the checkout re-renders with fresh prices (G3) next to the message.
 */
export async function placeOrder(_previous: ActionState, formData: FormData): Promise<ActionState> {
  const values = readFormValues(formData, CHECKOUT_FORM_FIELDS);
  return runAction(
    "orders.place",
    values,
    async ({ placeOrderUseCase }) => {
      const result = await placeOrderUseCase.execute({
        lines: await readCartLines(),
        request: values,
        // Guest orders only until E07 Phase 2b adds the checkout modes (`checkoutAs`, A24); the
        // customer id will come from the session then, never from the form.
        customerId: null,
      });
      await writeCartLines([]);
      return {
        event: result.replayed ? "order.place.replayed" : "order.placed",
        id: result.orderId,
        redirectTo: orderPaths.pay(result.reference),
      };
    },
    { refreshOnError: true },
  );
}

/**
 * Confirms the demo payment (`confirmDemoPayment`). Reading an order by reference counts
 * against the lookup limit (A15), so the button cannot be used to probe references. The viewer
 * is the session's customer (E07 spec A2, A24): another customer's account order, or one posted
 * without that customer's session, is "not found" and stays unpaid.
 */
export async function confirmDemoPayment(
  _previous: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const values = { reference: readFormValue(formData, "reference") };
  return runAction("payments.demo.confirm", values, async (cradle) => {
    if (!(await consumeOrderLookup(cradle.rateLimiter, getEnv(), await headers()))) {
      throw new ConflictError(TOO_MANY_LOOKUPS_MESSAGE);
    }
    const result = await cradle.confirmDemoPaymentUseCase.execute({
      reference: values.reference,
      viewer: toOrderViewer(await getCurrentCustomerId()),
    });
    return {
      event: result.outcome === "paid" ? "payment.demo.confirmed" : "payment.demo.already_paid",
      id: result.orderId,
      redirectTo: orderPaths.confirmation(result.reference),
    };
  });
}

/**
 * Order lookup (`lookupOrder`): checks the format only and goes to the order page, which reads
 * the order (and counts against the lookup limit). No order is read here.
 */
export async function lookupOrder(
  _previous: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const values = { reference: readFormValue(formData, "reference") };
  return runAction("orders.lookup", values, async () => {
    const reference = normalizeOrderReference(values.reference);
    if (!reference) {
      throw new ValidationError(REFERENCE_FORMAT_MESSAGE, {
        reference: [REFERENCE_FORMAT_MESSAGE],
      });
    }
    return { event: "order.lookup", id: "-", redirectTo: orderPaths.order(reference) };
  });
}
