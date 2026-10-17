/**
 * Base class for every domain and application error. `code` is a stable,
 * machine-readable identifier; `message` is safe to show to the caller.
 * The presentation layer maps the subclasses below to HTTP status codes;
 * any other AppError signals a broken invariant and is treated as internal.
 */
export class AppError extends Error {
  constructor(
    readonly code: string,
    message: string,
    options?: ErrorOptions,
  ) {
    super(message, options);
    this.name = new.target.name;
  }
}

export type FieldErrors = Record<string, string[]>;

/** Input failed validation. `fieldErrors` maps field paths to messages. */
export class ValidationError extends AppError {
  constructor(
    message = "The request is invalid.",
    readonly fieldErrors: FieldErrors = {},
  ) {
    super("VALIDATION_FAILED", message);
  }
}

export class NotFoundError extends AppError {
  constructor(message = "The requested resource was not found.") {
    super("NOT_FOUND", message);
  }
}

/**
 * True for an error carrying the given stable `code`, from any copy of this package.
 * Compare codes instead of using `instanceof`: Next.js can bundle `@commerceos/core` into
 * more than one server chunk, and the DI container cached on `globalThis` may hold use cases
 * built from another chunk's copy, so `instanceof NotFoundError` can be false for a genuine one.
 */
export function hasAppErrorCode<Code extends string>(
  error: unknown,
  code: Code,
): error is Error & { readonly code: Code } {
  return error instanceof Error && "code" in error && error.code === code;
}

/** True for a `NotFoundError` from any copy of this package (see `hasAppErrorCode`). */
export function isNotFoundError(error: unknown): error is NotFoundError {
  return hasAppErrorCode(error, "NOT_FOUND");
}

/** No authenticated user. */
export class UnauthorizedError extends AppError {
  constructor(message = "Authentication is required.") {
    super("UNAUTHORIZED", message);
  }
}

/** Authenticated, but not allowed to perform this operation. */
export class ForbiddenError extends AppError {
  constructor(message = "You are not allowed to perform this operation.") {
    super("FORBIDDEN", message);
  }
}

/** The operation conflicts with the current state (duplicate slug, stale stock, …). */
export class ConflictError extends AppError {
  constructor(message = "The request conflicts with the current state.") {
    super("CONFLICT", message);
  }
}

/**
 * A unique value (a slug, a SKU) is already taken. `field` names the input that caused it, so
 * a form can show the message under that field. Raised by the repository adapters when the
 * database's unique constraint fires: there is no check-then-write race.
 */
export class UniqueFieldConflictError extends ConflictError {
  constructor(
    readonly field: string,
    message: string,
  ) {
    super(message);
  }
}

/** True for a `UniqueFieldConflictError` from any copy of this package (see `hasAppErrorCode`). */
export function isUniqueFieldConflict(
  error: unknown,
): error is Error & { readonly code: "CONFLICT"; readonly field: string } {
  return hasAppErrorCode(error, "CONFLICT") && "field" in error && typeof error.field === "string";
}

/**
 * A stock change was refused because the stored quantity is no longer the one the form showed
 * (admin catalog spec A5): a checkout or another tab changed it meanwhile. Nothing was written.
 * `currentQuantity` lets the form reset itself to the value now stored.
 */
export class StaleStockError extends ConflictError {
  constructor(readonly currentQuantity: number) {
    super(`Stock changed to ${currentQuantity} since this page loaded. Check it and try again.`);
  }
}

/** True for a `StaleStockError` from any copy of this package (see `hasAppErrorCode`). */
export function isStaleStockError(
  error: unknown,
): error is Error & { readonly code: "CONFLICT"; readonly currentQuantity: number } {
  return (
    hasAppErrorCode(error, "CONFLICT") &&
    "currentQuantity" in error &&
    typeof error.currentQuantity === "number"
  );
}

/** Too many requests from one caller in a short time (Copilot spec A4); nothing was done. */
export class TooManyRequestsError extends AppError {
  constructor(message = "Too many requests. Try again in a few minutes.") {
    super("RATE_LIMITED", message);
  }
}

/** Codes of the errors whose message is safe and meaningful for the client. */
export const CLIENT_ERROR_CODES = [
  "VALIDATION_FAILED",
  "UNAUTHORIZED",
  "FORBIDDEN",
  "NOT_FOUND",
  "CONFLICT",
  "RATE_LIMITED",
] as const;

export type ClientErrorCode = (typeof CLIENT_ERROR_CODES)[number];
