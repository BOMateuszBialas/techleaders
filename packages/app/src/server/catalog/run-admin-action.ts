import "server-only";
import { hasAppErrorCode } from "@commerceos/core";
import type { AwilixContainer } from "awilix";
import { refresh, updateTag } from "next/cache";
import { redirect, unstable_rethrow } from "next/navigation";
import type { ActionState, FormValues } from "@/lib/action-state";
import { requireAdmin, SIGN_IN_PAGE } from "../auth/require-admin";
import { createRequestScope, type Cradle } from "../container";
import { GENERIC_ACTION_ERROR, toActionErrorState } from "../http/action-error-state";
import { logger } from "../logger";
import { CATALOG_CACHE_TAG } from "./cache-tags";

/**
 * What a successful handler reports: a log event with the record id (ids only, no free text),
 * and either a message describing the effect (the form stays on the page, spec G12) or a
 * page to go to (create, delete).
 */
export type AdminActionSuccess = { event: string; id: string } & (
  { message: string } | { redirectTo: string }
);

export { GENERIC_ACTION_ERROR };

type Outcome =
  | { kind: "state"; state: ActionState; changed: boolean }
  | { kind: "redirect"; to: string; changed: boolean };

/**
 * The one way an admin server action runs (admin catalog spec, Architecture and cross-model
 * review). In order:
 * 1. `requireAdmin()` runs first, before any handler code, so no export can mutate without a
 *    session. No session → redirect to the sign-in page; no use case is resolved.
 * 2. The handler runs against a fresh request scope, disposed afterwards.
 * 3. Errors become form states: field errors (validation, a taken slug), the safe message of
 *    a known client error, or a generic message for anything else (logged with the action
 *    name, never shown).
 * 4. On success the catalog cache tag is updated, and the page is refreshed or redirected.
 *
 * `redirect()` runs after the try/catch, never inside it, and the catch rethrows Next.js
 * control flow first (`unstable_rethrow`), so a framework signal is never swallowed.
 */
export async function runAdminAction(
  name: string,
  values: FormValues,
  handler: (cradle: Cradle) => Promise<AdminActionSuccess>,
): Promise<ActionState> {
  let outcome: Outcome;
  let scope: AwilixContainer<Cradle> | undefined;
  try {
    await requireAdmin();
    scope = createRequestScope();
    const success = await handler(scope.cradle);
    logger.info(success.event, { id: success.id });
    outcome =
      "redirectTo" in success
        ? { kind: "redirect", to: success.redirectTo, changed: true }
        : { kind: "state", state: { status: "success", message: success.message }, changed: true };
  } catch (error) {
    unstable_rethrow(error);
    outcome = hasAppErrorCode(error, "UNAUTHORIZED")
      ? { kind: "redirect", to: SIGN_IN_PAGE, changed: false }
      : { kind: "state", state: toErrorState(name, error, values), changed: false };
  } finally {
    await scope?.dispose();
  }

  if (outcome.changed) updateTag(CATALOG_CACHE_TAG);
  if (outcome.kind === "redirect") redirect(outcome.to);
  if (outcome.changed) refresh();
  return outcome.state;
}

/** Maps a failure to the form state; only client errors carry their own message. */
function toErrorState(name: string, error: unknown, values: FormValues): ActionState {
  const known = toActionErrorState(error, values);
  if (known) return known;
  logger.error("Admin action failed", { action: name, error });
  return { status: "error", message: GENERIC_ACTION_ERROR, values };
}
