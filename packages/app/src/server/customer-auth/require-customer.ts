import "server-only";
import {
  GUEST_ORDER_VIEWER,
  isCustomerRole,
  UnauthorizedError,
  type CustomerRole,
  type OrderViewer,
} from "@commerceos/core";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { connection } from "next/server";
import { summarizeAuthError } from "../auth/create-auth";
import { getCustomerAuth } from "../container";
import { apiHandler } from "../http/api-handler";
import { logger } from "../logger";

/**
 * The only way storefront code checks which customer is signed in (E07 spec, Architecture): the
 * mirror of `require-admin.ts` for the account area. Every page under `app/(storefront)/account/`
 * (except sign-in and sign-up) and every route under `app/api/account/` calls one of these on
 * the server. `admin-guard-inventory.test.ts` fails when an entry point skips it, and it forbids
 * crossing the two guards: admin code never imports this module, account code never imports
 * `require-admin.ts`. The customer instance reads only the `commerceos-customer.*` cookie, so an
 * owner session is never a customer session (spec R09).
 */

export const CUSTOMER_SIGN_IN_PAGE = "/account/sign-in";

/** What storefront code may know about the signed-in customer: never the session or token. */
export type CustomerPrincipal = { id: string; email: string; role: CustomerRole };

/**
 * The tri-state session read of spec A24: a session-read failure is not "no session". Callers
 * decide what an `error` means for them; checkout never turns it into a silent guest order.
 */
export type CustomerIdResult =
  | { status: "customer"; customerId: string; email: string }
  | { status: "none" }
  | { status: "error" };

async function readCustomerSession() {
  // Read the request first: the instance is created only at request time, never while
  // prerendering (it checks the database schema when it first initialises).
  const requestHeaders = await headers();
  return getCustomerAuth().api.getSession({ headers: requestHeaders });
}

function toPrincipal(
  session: Awaited<ReturnType<typeof readCustomerSession>>,
): CustomerPrincipal | null {
  if (!session || !isCustomerRole(session.user.role)) return null;
  return { id: session.user.id, email: session.user.email, role: session.user.role };
}

/** The signed-in customer, or null. A session-read failure propagates (error state or 500). */
export async function getCurrentCustomer(): Promise<CustomerPrincipal | null> {
  return toPrincipal(await readCustomerSession());
}

/**
 * The signed-in customer as a tri-state result that never throws on a session-read failure
 * (spec A24): the failure is logged as `customer_auth.session_error` and returned as `error`,
 * never as `none`. For the storefront header and checkout, which must render either way.
 */
export async function getCurrentCustomerId(): Promise<CustomerIdResult> {
  // Outside the try: during prerendering `headers()` rejects to stop the render, which must not
  // be mistaken for a session-read failure (lesson 2026-10-15).
  const requestHeaders = await headers();
  let principal: CustomerPrincipal | null;
  try {
    principal = toPrincipal(await getCustomerAuth().api.getSession({ headers: requestHeaders }));
  } catch (error) {
    logger.error("Customer session read failed", {
      event: "customer_auth.session_error",
      error: summarizeAuthError(error),
    });
    return { status: "error" };
  }
  return principal
    ? { status: "customer", customerId: principal.id, email: principal.email }
    : { status: "none" };
}

/**
 * The viewer for reads by public reference (E07 spec A2, A24): the signed-in customer, or a guest
 * viewer for no session **and** for a session-read failure, so account orders answer "not found"
 * until the session read recovers while guest orders keep working. Only the public order and
 * payment paths use it, never checkout (which must not turn a failure into a guest silently).
 */
export function toOrderViewer(result: CustomerIdResult): OrderViewer {
  return result.status === "customer" ? { customerId: result.customerId } : GUEST_ORDER_VIEWER;
}

/** For Server Components and page loaders: no customer → redirect to the customer sign-in page. */
export async function requireCustomerPage(): Promise<CustomerPrincipal> {
  return (await getCurrentCustomer()) ?? redirect(CUSTOMER_SIGN_IN_PAGE);
}

/**
 * Whether this request carries a customer session, for UI that only switches between "signed
 * in" and "not signed in" (the storefront header, the checkout note, the sign-in and sign-up
 * pages). A session-read failure counts as not signed in, so those surfaces still render (A24).
 */
export async function isCustomerSignedIn(): Promise<boolean> {
  return (await getCurrentCustomerId()).status === "customer";
}

/** For route handlers and server actions: no customer → `UnauthorizedError` (401 via `apiHandler`). */
export async function requireCustomer(): Promise<CustomerPrincipal> {
  const customer = await getCurrentCustomer();
  if (!customer) throw new UnauthorizedError();
  return customer;
}

/** `apiHandler` plus `requireCustomer`: the wrapper for every `/api/account/*` route. */
export function customerApiHandler<Rest extends unknown[]>(
  route: string,
  handler: (request: Request, customer: CustomerPrincipal, ...rest: Rest) => Promise<Response>,
): (request: Request, ...rest: Rest) => Promise<Response> {
  const guarded = apiHandler(route, async (request: Request, ...rest: Rest) =>
    handler(request, await requireCustomer(), ...rest),
  );
  return async (request, ...rest) => {
    // Request time only, and outside apiHandler's try/catch: during `next build` this
    // rejects to stop the prerender, which must not be logged as a route error.
    await connection();
    return guarded(request, ...rest);
  };
}
