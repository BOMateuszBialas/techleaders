import "server-only";
import {
  ConflictError,
  ForbiddenError,
  NotFoundError,
  UnauthorizedError,
  ValidationError,
} from "@commerceos/core";
import { z } from "zod";
import { logger } from "../logger";
import { jsonError } from "./api-result";

const INTERNAL_ERROR = { code: "INTERNAL_ERROR", message: "Something went wrong." } as const;

/** Only these errors carry a message that is safe and meaningful for the client. */
const CLIENT_ERROR_STATUS = [
  [ValidationError, 400],
  [UnauthorizedError, 401],
  [ForbiddenError, 403],
  [NotFoundError, 404],
  [ConflictError, 409],
] as const;

/**
 * Maps a known client error to an `ApiResult` response with its code and
 * message. Returns null for anything else, which callers treat as internal.
 */
export function toClientErrorResponse(error: unknown): Response | null {
  for (const [ErrorClass, status] of CLIENT_ERROR_STATUS) {
    if (error instanceof ErrorClass) {
      const fieldErrors = error instanceof ValidationError ? error.fieldErrors : undefined;
      return jsonError({ code: error.code, message: error.message, fieldErrors }, status);
    }
  }
  return null;
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
