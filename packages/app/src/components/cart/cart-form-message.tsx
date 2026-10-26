import { Alert, AlertDescription } from "@/components/ui/alert";
import type { ActionState } from "@/lib/action-state";

/**
 * The form-level result of a cart form (retrofit Phase 1, B2.18): an error after an action is an
 * `Alert` with `role="alert"`, a success is an `Alert` with `role="status"`. Renders nothing
 * before the first submit.
 */
export function CartFormMessage({ state }: { state: ActionState }) {
  if (state.status === "error") {
    return (
      <Alert variant="destructive" role="alert">
        <AlertDescription>{state.message}</AlertDescription>
      </Alert>
    );
  }
  if (state.status === "success") {
    return (
      <Alert variant="success" role="status">
        <AlertDescription>{state.message}</AlertDescription>
      </Alert>
    );
  }
  return null;
}
