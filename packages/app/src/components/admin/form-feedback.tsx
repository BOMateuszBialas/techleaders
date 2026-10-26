import type { ActionState } from "@/lib/action-state";

/**
 * The form-level result of an admin action: an alert for errors, a status message for
 * success (spec UI/UX "States"). Renders nothing before the first submit.
 */
export function FormMessage({ state }: { state: ActionState }) {
  if (state.status === "error") {
    return (
      <p role="alert" className="text-sm text-destructive">
        {state.message}
      </p>
    );
  }
  if (state.status === "success") {
    return (
      <p role="status" className="text-sm font-medium text-success">
        {state.message}
      </p>
    );
  }
  return null;
}

/** The messages under one input, referenced by the input's `aria-describedby`. */
export function FieldError({ id, messages }: { id: string; messages: string[] | undefined }) {
  return messages && messages.length > 0 ? (
    <p id={id} className="text-sm text-destructive">
      {messages.join(" ")}
    </p>
  ) : null;
}

// The helper moved to `lib/field-a11y.ts` (retrofit Phase 1); re-exported so admin imports stay.
export { fieldA11y } from "@/lib/field-a11y";
