import "server-only";
import {
  CLIENT_ERROR_CODES,
  type ClientErrorCode,
  type FieldErrors,
  ValidationError,
  hasAppErrorCode,
} from "@commerceos/core";
import { z } from "zod";
import { logger } from "../logger";
import { jsonError } from "./api-result";

const INTERNAL_ERROR = { code: "INTERNAL_ERROR", message: "Something went wrong." } as const;

/**
 * Only these errors carry a message that is safe and meaningful for the client.
 * Keyed by the stable `code`, not the class: `instanceof` can fail for an error built
 * by another bundled copy of `@commerceos/core` (see `hasAppErrorCode`).
 */
const CLIENT_ERROR_STATUS: Record<ClientErrorCode, number> = {
  VALIDATION_FAILED: 400,
  UNAUTHORIZED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  CONFLICT: 409,
  RATE_LIMITED: 429,
};

const FIELD_ERRORS_SCHEMA = z.record(z.string(), z.array(z.string()));

/**
 * Maps a known client error to an `ApiResult` response with its code and
 * message. Returns null for anything else, which callers treat as internal.
 */
export function toClientErrorResponse(error: unknown): Response | null {
  for (const code of CLIENT_ERROR_CODES) {
    if (hasAppErrorCode(error, code)) {
      const fieldErrors = code === "VALIDATION_FAILED" ? fieldErrorsOf(error) : undefined;
      return jsonError({ code, message: error.message, fieldErrors }, CLIENT_ERROR_STATUS[code]);
    }
  }
  return null;
}

/**
 * Reads `fieldErrors` structurally, as `ValidationError` defines it (defaulting to `{}`).
 * A missing or malformed value becomes `{}`, so the client never sees an unexpected shape.
 */
export function fieldErrorsOf(error: Error): FieldErrors {
  const parsed = FIELD_ERRORS_SCHEMA.safeParse("fieldErrors" in error ? error.fieldErrors : {});
  return parsed.success ? parsed.data : {};
}

/**
 * Wraps a route handler: translates known application errors into consistent
 * JSON responses and logs unexpected errors without leaking them to the client.
 */
export function apiHandler<Args extends unknown[]>(
  route: string,
  handler: (...args: Args) => Promise<Response>,
): (...args: Args) => Promise<Response> {
  return async (...args) => {
    try {
      return await handler(...args);
    } catch (error) {
      const clientResponse = toClientErrorResponse(error);
      if (clientResponse) return clientResponse;

      logger.error("Unhandled error in API route", { route, error });
      return jsonError(INTERNAL_ERROR, 500);
    }
  };
}

/**
 * Reads and validates a JSON request body. Invalid JSON or schema failures
 * become a `ValidationError` (400) with per-field messages.
 */
export async function parseRequestBody<T>(request: Request, schema: z.ZodType<T>): Promise<T> {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    throw new ValidationError("The request body must be valid JSON.");
  }

  const result = schema.safeParse(body);
  if (!result.success) {
    const { fieldErrors, formErrors } = z.flattenError(result.error);
    throw new ValidationError(
      formErrors[0] ?? "The request is invalid.",
      toFieldErrors(fieldErrors),
    );
  }
  return result.data;
}

function toFieldErrors(
  fieldErrors: Record<string, string[] | undefined>,
): Record<string, string[]> {
  return Object.fromEntries(
    Object.entries(fieldErrors).filter(
      (entry): entry is [string, string[]] => entry[1] !== undefined,
    ),
  );
}
