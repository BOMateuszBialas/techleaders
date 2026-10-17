/**
 * A database failure stripped of its query details. MikroORM's driver exceptions (class names
 * ending in `Exception`) put the failed SQL with its inlined parameters, and PostgreSQL's
 * `detail` ("Key (…)=(…)"), into the message. For orders those parameters are personal data
 * and bearer references, and the app logs an unexpected error's message, so this error keeps
 * only the operation, the exception class, the SQLSTATE and the constraint name.
 */
export class DatabaseOperationError extends Error {
  constructor(operation: string, source: Error) {
    const code = "code" in source && typeof source.code === "string" ? source.code : null;
    const constraint =
      "constraint" in source && typeof source.constraint === "string" ? source.constraint : null;
    const details = [code && `SQLSTATE ${code}`, constraint && `constraint ${constraint}`]
      .filter(Boolean)
      .join(", ");
    super(`${operation} failed: ${source.name}${details ? ` (${details})` : ""}`);
    this.name = "DatabaseOperationError";
  }
}

/**
 * Replaces a driver exception with a `DatabaseOperationError`; anything else (an application
 * error such as `InsufficientStockError`, a plain `Error`) is returned unchanged.
 */
export function sanitizeDatabaseError(operation: string, error: unknown): unknown {
  return error instanceof Error && error.name.endsWith("Exception")
    ? new DatabaseOperationError(operation, error)
    : error;
}

/** Runs a database call and sanitizes what it throws (see `sanitizeDatabaseError`). */
export async function withSanitizedErrors<T>(operation: string, run: () => Promise<T>): Promise<T> {
  try {
    return await run();
  } catch (error) {
    throw sanitizeDatabaseError(operation, error);
  }
}
