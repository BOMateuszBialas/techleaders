/** The `ApiResult` error code a data-source failure carries (FALL-02, owner 2026-11-09). */
export const COPILOT_DATA_UNAVAILABLE_CODE = "COPILOT_DATA_UNAVAILABLE";
/** Server-side text; the page shows its own copy for the code, never this text. */
export const COPILOT_DATA_UNAVAILABLE_MESSAGE = "Copilot data is temporarily unavailable.";

/**
 * A read tool failed (the database is down, a query threw). The answer is unavailable: no
 * recommendation is shown, and the route answers with `COPILOT_DATA_UNAVAILABLE` instead of a
 * generic 500. Any other error is not this one and keeps its 500 path.
 */
export class CopilotDataUnavailableError extends Error {
  readonly code = COPILOT_DATA_UNAVAILABLE_CODE;

  constructor(cause: unknown) {
    super(COPILOT_DATA_UNAVAILABLE_MESSAGE, { cause });
    this.name = "CopilotDataUnavailableError";
  }
}

/**
 * Checked by name, not `instanceof`: the error can come from another bundled copy of
 * `@commerceos/ai` (the same reason `hasAppErrorCode` reads a code).
 */
export function isCopilotDataUnavailable(error: unknown): error is CopilotDataUnavailableError {
  return error instanceof Error && error.name === "CopilotDataUnavailableError";
}
