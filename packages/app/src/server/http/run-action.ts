import "server-only";
import type { AwilixContainer } from "awilix";
import { refresh } from "next/cache";
import { redirect, unstable_rethrow } from "next/navigation";
import type { ActionState, FormValues } from "@/lib/action-state";
import { createRequestScope, type Cradle } from "../container";
import { logger } from "../logger";
import { GENERIC_ACTION_ERROR, toActionErrorState } from "./action-error-state";

/**
 * What a successful shopper action reports: a log event with a record id (ids only: never
 * personal data, free text or an order reference) and either the message the form shows or a
 * page to go to.
 */
export type ActionSuccess = { event: string; id: string } & (
  { message: string } | { redirectTo: string }
);

export type RunActionOptions = {
  /**
   * Re-render the current page after a failure, so it shows fresh server data next to the
   * error (the checkout's new prices after "Prices changed", cart spec G3).
   */
  refreshOnError?: boolean;
};

/**
 * The one way a public (shopper) server action runs (cart spec A12, "runAction"): the twin of
 * `runAdminAction` without the session check, because shoppers are anonymous.
 * 1. The handler runs against a fresh request scope, disposed afterwards.
 * 2. Errors become form states: field errors, the safe message of a known client error, or a
 *    generic message for anything else (logged with the action name, never shown).
 * 3. On success the form shows the message, or the shopper is redirected.
 * `redirect()` runs after the try/catch, never inside it, and the catch rethrows Next.js
 * control flow first (`unstable_rethrow`). A handler that sets a cookie makes Next.js
 * re-render the current page, so no explicit refresh is needed on success.
 */
export async function runAction(
  name: string,
  values: FormValues,
  handler: (cradle: Cradle) => Promise<ActionSuccess>,
  options: RunActionOptions = {},
): Promise<ActionState> {
  let outcome: { kind: "state"; state: ActionState } | { kind: "redirect"; to: string };
  let scope: AwilixContainer<Cradle> | undefined;
  try {
    scope = createRequestScope();
    const success = await handler(scope.cradle);
    logger.info(success.event, { id: success.id });
    outcome =
      "redirectTo" in success
        ? { kind: "redirect", to: success.redirectTo }
        : { kind: "state", state: { status: "success", message: success.message } };
  } catch (error) {
    unstable_rethrow(error);
    outcome = { kind: "state", state: toErrorState(name, error, values) };
    if (options.refreshOnError) refresh();
  } finally {
    await scope?.dispose();
  }

  if (outcome.kind === "redirect") redirect(outcome.to);
  return outcome.state;
}

function toErrorState(name: string, error: unknown, values: FormValues): ActionState {
  const known = toActionErrorState(error, values);
  if (known) return known;
  logger.error("Action failed", { action: name, error });
  return { status: "error", message: GENERIC_ACTION_ERROR, values };
}
