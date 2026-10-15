import "server-only";
import { isAdminRole, UnauthorizedError, type AdminRole } from "@commerceos/core";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { connection } from "next/server";
import { getAuth } from "../container";
import { apiHandler } from "../http/api-handler";

/**
 * The only way admin code checks who is signed in (spec, Architecture). Every admin
 * page, route handler and server action calls one of these on the server; hiding UI is
 * not authorization. `admin-guard-inventory.test.ts` fails when an entry point skips it.
 */

export const SIGN_IN_PAGE = "/admin/sign-in";

/** What admin code may know about the signed-in owner: never the session or token. */
export type AdminPrincipal = { id: string; email: string; role: AdminRole };

export async function getCurrentAdmin(): Promise<AdminPrincipal | null> {
  // Read the request first: the auth instance is created only at request time, never while
  // prerendering (it checks the database schema when it first initialises).
  const requestHeaders = await headers();
  const session = await getAuth().api.getSession({ headers: requestHeaders });
  if (!session || !isAdminRole(session.user.role)) return null;
  return { id: session.user.id, email: session.user.email, role: session.user.role };
}

/** For Server Components and page loaders: no admin → redirect to the sign-in page. */
export async function requireAdminPage(): Promise<AdminPrincipal> {
  return (await getCurrentAdmin()) ?? redirect(SIGN_IN_PAGE);
}

/** For route handlers and server actions: no admin → `UnauthorizedError` (401 via `apiHandler`). */
export async function requireAdmin(): Promise<AdminPrincipal> {
  const admin = await getCurrentAdmin();
  if (!admin) throw new UnauthorizedError();
  return admin;
}

/** `apiHandler` plus `requireAdmin`: the wrapper for every `/api/admin/*` route. */
export function adminApiHandler<Rest extends unknown[]>(
  route: string,
  handler: (request: Request, admin: AdminPrincipal, ...rest: Rest) => Promise<Response>,
): (request: Request, ...rest: Rest) => Promise<Response> {
  const guarded = apiHandler(route, async (request: Request, ...rest: Rest) =>
    handler(request, await requireAdmin(), ...rest),
  );
  return async (request, ...rest) => {
    // Request time only, and outside apiHandler's try/catch: during `next build` this
    // rejects to stop the prerender, which must not be logged as a route error.
    await connection();
    return guarded(request, ...rest);
  };
}
