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

/**
 * Accessibility attributes for an input: `aria-invalid` when it has errors, and
 * `aria-describedby` pointing at its hints and its error message.
 */
export function fieldA11y(
  errorId: string,
  messages: string[] | undefined,
  hintIds: string[] = [],
): { "aria-invalid": boolean; "aria-describedby": string | undefined } {
  const invalid = messages !== undefined && messages.length > 0;
  const describedBy = [...hintIds, ...(invalid ? [errorId] : [])];
  return {
    "aria-invalid": invalid,
    "aria-describedby": describedBy.length > 0 ? describedBy.join(" ") : undefined,
  };
}
