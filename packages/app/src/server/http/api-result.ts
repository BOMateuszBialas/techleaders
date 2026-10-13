import type { FieldErrors } from "@commerceos/core";

/**
 * Response envelope for every API route except `GET /api/health`, which keeps
 * its own protected contract (BACKWARD_COMPATIBILITY.md).
 */
export type ApiError = {
  code: string;
  message: string;
  fieldErrors?: FieldErrors;
};

export type ApiResult<T> = { ok: true; data: T } | { ok: false; error: ApiError };

const NO_STORE = { "Cache-Control": "no-store" };

export function jsonOk<T>(data: T, init: { status?: number } = {}): Response {
  const body: ApiResult<T> = { ok: true, data };
  return Response.json(body, { status: init.status ?? 200, headers: NO_STORE });
}

export function jsonError(error: ApiError, status: number): Response {
  const body: ApiResult<never> = { ok: false, error };
  return Response.json(body, { status, headers: NO_STORE });
}
