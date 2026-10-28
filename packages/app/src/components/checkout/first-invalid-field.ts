import type { ActionState } from "@/lib/action-state";

/** The DOM id of a checkout field's input (`checkout-<name>`, see `checkout-form-view.tsx`). */
export function checkoutFieldId(name: string): string {
  return `checkout-${name}`;
}

/**
 * The id of the first field, in the form's order, that has a message in `fieldErrors`; `null`
 * when no field has one (a conflict or a server error keeps the focus where it is). Names that
 * are not form fields are ignored (retrofit Phase 2, C3).
 */
export function firstInvalidFieldId(
  fieldNames: readonly string[],
  fieldErrors: ActionState["fieldErrors"],
): string | null {
  const first = fieldNames.find((name) => (fieldErrors?.[name]?.length ?? 0) > 0);
  return first === undefined ? null : checkoutFieldId(first);
}

/**
 * The effect `CheckoutForm` runs after each result: after a failed submit with field errors,
 * focus the first invalid field (tokeny.md §7 rule 13, owner approval OA-2). The logic lives
 * here, where unit tests can reach it; the client wrapper only wires it to `useEffect`.
 */
export function focusFirstInvalidEffect(
  state: ActionState,
  fieldNames: readonly string[],
): () => void {
  return () => {
    const id = firstInvalidFieldId(fieldNames, state.fieldErrors);
    if (id === null) return;
    globalThis.document.getElementById(id)?.focus();
  };
}
