"use server";

import {
  ADDED_TO_CART_MESSAGE,
  CART_UPDATED_MESSAGE,
  LINE_REMOVED_MESSAGE,
} from "@/components/cart/cart-copy";
import type { ActionState } from "@/lib/action-state";
import { readFormValue } from "../catalog/form-data";
import { runAction } from "../http/run-action";
import { readCartLines, writeCartLines } from "./cart-cookie";

// Every export of a "use server" file is a public POST endpoint. These are shopper actions:
// anonymous by design (no session), so each runs through runAction. They only ever change the
// caller's own cart cookie, and every value is re-validated against the catalog.

/** The posted line: only these fields are read, as strings ("" when missing). */
function readLine(formData: FormData) {
  return {
    productId: readFormValue(formData, "productId"),
    quantity: readFormValue(formData, "quantity"),
  };
}

/** Adds a product to the cart (cart spec, API Contracts `addToCart`). */
export async function addToCart(_previous: ActionState, formData: FormData): Promise<ActionState> {
  const values = readLine(formData);
  return runAction("cart.add", values, async ({ addToCartUseCase }) => {
    const result = await addToCartUseCase.execute({
      lines: await readCartLines(),
      request: values,
    });
    await writeCartLines(result.lines);
    return { event: "cart.line.added", id: values.productId, message: ADDED_TO_CART_MESSAGE };
  });
}

/** Changes a line's quantity (`updateCartLine`). */
export async function updateCartLine(
  _previous: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const values = readLine(formData);
  return runAction("cart.update", values, async ({ updateCartLineUseCase }) => {
    const result = await updateCartLineUseCase.execute({
      lines: await readCartLines(),
      request: values,
    });
    await writeCartLines(result.lines);
    return { event: "cart.line.updated", id: values.productId, message: CART_UPDATED_MESSAGE };
  });
}

/** Removes a line (`removeCartLine`); removing an absent line is a no-op. */
export async function removeCartLine(
  _previous: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const values = { productId: readFormValue(formData, "productId") };
  return runAction("cart.remove", values, async ({ removeCartLineUseCase }) => {
    const result = await removeCartLineUseCase.execute({
      lines: await readCartLines(),
      request: values,
    });
    await writeCartLines(result.lines);
    return { event: "cart.line.removed", id: values.productId, message: LINE_REMOVED_MESSAGE };
  });
}
