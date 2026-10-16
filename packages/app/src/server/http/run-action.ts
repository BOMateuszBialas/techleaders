import "server-only";
import type { AwilixContainer } from "awilix";
import { unstable_rethrow } from "next/navigation";
import type { ActionState, FormValues } from "@/lib/action-state";
import { createRequestScope, type Cradle } from "../container";
import { logger } from "../logger";
import { GENERIC_ACTION_ERROR, toActionErrorState } from "./action-error-state";

/**
 * What a successful shopper action reports: a log event with a record id (ids only: never
 * personal data or free text) and the message the form shows.
 */
export type ActionSuccess = { event: string; id: string; message: string };

/**
 * The one way a public (shopper) server action runs (cart spec A12, "runAction"): the twin of
 * `runAdminAction` without the session check, because shoppers are anonymous.
 * 1. The handler runs against a fresh request scope, disposed afterwards.
 * 2. Errors become form states: field errors, the safe message of a known client error, or a
 *    generic message for anything else (logged with the action name, never shown).
 * The catch rethrows Next.js control flow first (`unstable_rethrow`), so a `redirect()` or
 * `notFound()` from the handler is never swallowed. A handler that sets a cookie makes Next.js
 * re-render the current page, so no explicit refresh is needed.
 */
export async function runAction(
  name: string,
  values: FormValues,
  handler: (cradle: Cradle) => Promise<ActionSuccess>,
): Promise<ActionState> {
  let scope: AwilixContainer<Cradle> | undefined;
  try {
    scope = createRequestScope();
    const success = await handler(scope.cradle);
    logger.info(success.event, { id: success.id });
    return { status: "success", message: success.message };
  } catch (error) {
    unstable_rethrow(error);
    const known = toActionErrorState(error, values);
    if (known) return known;
    logger.error("Action failed", { action: name, error });
    return { status: "error", message: GENERIC_ACTION_ERROR, values };
  } finally {
    await scope?.dispose();
  }
}
