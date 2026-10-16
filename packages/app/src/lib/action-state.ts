import type { FieldErrors } from "@commerceos/core";

/** The raw text the owner typed, by field name, so a failed submit keeps it. */
export type FormValues = Record<string, string>;

/**
 * What an admin server action returns to its form (admin catalog spec, Architecture).
 * Client-safe: forms import it, so it holds no server code.
 */
export type ActionState = {
  status: "idle" | "success" | "error";
  /** Form-level text: `role="status"` on success, `role="alert"` on error. */
  message?: string;
  /** Messages shown under each input. */
  fieldErrors?: FieldErrors;
  /** The submitted values, returned on error so the form shows what the owner typed. */
  values?: FormValues;
};

/** The signature `useActionState` expects from a form action (admin or shopper). */
export type FormAction = (previous: ActionState, formData: FormData) => Promise<ActionState>;

/** An admin form action (same signature as `FormAction`). */
export type AdminFormAction = FormAction;

export const IDLE_ACTION_STATE: ActionState = { status: "idle" };

/**
 * The value an input starts with: what the owner submitted when the last submit failed,
 * otherwise the stored value (blank for a new record).
 */
export function fieldDefault(state: ActionState, field: string, stored = ""): string {
  return state.status === "error" ? (state.values?.[field] ?? stored) : stored;
}
