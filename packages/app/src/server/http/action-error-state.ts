import "server-only";
import {
  CLIENT_ERROR_CODES,
  INVALID_FIELDS_MESSAGE,
  hasAppErrorCode,
  isUniqueFieldConflict,
} from "@commerceos/core";
import type { ActionState, FormValues } from "@/lib/action-state";
import { fieldErrorsOf } from "./api-handler";

/** Shown for an unexpected failure; the error itself is logged, never shown. */
export const GENERIC_ACTION_ERROR = "Something went wrong. Try again.";

/**
 * Maps a known client error to the state a form shows: field errors for validation and for a
 * taken unique value, otherwise the error's own (safe) message. The submitted `values` come
 * back so the form keeps what was typed. Returns `null` for anything else: the caller logs it
 * and shows a generic message. Shared by `runAdminAction` and `runAction`, the server-action
 * twins of `apiHandler`, and keyed by the stable `code` like it (never `instanceof`).
 */
export function toActionErrorState(error: unknown, values: FormValues): ActionState | null {
  if (isUniqueFieldConflict(error)) {
    return {
      status: "error",
      message: INVALID_FIELDS_MESSAGE,
      fieldErrors: { [error.field]: [error.message] },
      values,
    };
  }
  if (hasAppErrorCode(error, "VALIDATION_FAILED")) {
    return { status: "error", message: error.message, fieldErrors: fieldErrorsOf(error), values };
  }
  for (const code of CLIENT_ERROR_CODES) {
    if (hasAppErrorCode(error, code)) return { status: "error", message: error.message, values };
  }
  return null;
}
