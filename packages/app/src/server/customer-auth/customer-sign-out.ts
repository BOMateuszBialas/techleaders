import "server-only";
import { headers } from "next/headers";
import { getCustomerAuth } from "../container";

/**
 * Deletes the current customer session row; the customer instance's `nextCookies()` expires
 * only the `commerceos-customer.*` cookies, so an owner session in the same browser survives
 * (spike d). Without a session the library only clears the cookie.
 */
export async function attemptCustomerSignOut(): Promise<void> {
  const requestHeaders = await headers();
  await getCustomerAuth().api.signOut({ headers: requestHeaders });
}
