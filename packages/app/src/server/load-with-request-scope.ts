import "server-only";
import { isNotFoundError } from "@commerceos/core";
import type { AwilixContainer } from "awilix";
import { createRequestScope, type Cradle } from "./container";
import { logger } from "./logger";

/** What a page loader hands to its page: data, "not found", or a generic error state. */
export type LoadResult<T> = { kind: "ok"; data: T } | { kind: "not-found" } | { kind: "error" };

/** Safe log context. Never put search terms or personal data here. */
export type LoadContext = { page: string; slug?: string };

/**
 * Runs `load` against a fresh request scope and disposes the scope afterwards.
 * `NotFoundError` becomes `{ kind: "not-found" }`; anything else (invalid env, database
 * down, a broken invariant) is logged with context and becomes `{ kind: "error" }`, so no
 * internal detail reaches the page. Framework control flow (`notFound()`, `redirect()`)
 * must be called by the page after this returns, never inside `load`.
 */
export async function loadWithRequestScope<T>(
  context: LoadContext,
  load: (cradle: Cradle) => Promise<T>,
): Promise<LoadResult<T>> {
  let scope: AwilixContainer<Cradle> | undefined;
  try {
    scope = createRequestScope();
    return { kind: "ok", data: await load(scope.cradle) };
  } catch (error) {
    if (isNotFoundError(error)) return { kind: "not-found" };
    logger.error("Page data could not be loaded", { ...context, error });
    return { kind: "error" };
  } finally {
    await scope?.dispose();
  }
}
