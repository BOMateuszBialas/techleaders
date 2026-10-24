"use server";

// SPIKE (E07 d, i): server actions that post to both Better Auth handlers and copy Set-Cookie
// into Next's cookie store, the way `server/auth/sign-in.ts` does for the owner.
import { parseSetCookieHeader, toCookieOptions } from "better-auth/cookies";
import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";
import { getAuth, getCustomerAuth } from "../container";
import { getEnv } from "../env";

type Handler = { handler: (request: Request) => Promise<Response> };

async function postAndCopy(target: Handler, endpoint: string, body: unknown): Promise<number> {
  const env = getEnv();
  const incoming = await headers();
  const forwarded = new Headers({ "content-type": "application/json" });
  for (const name of ["origin", "user-agent", "cookie"]) {
    const value = incoming.get(name);
    if (value) forwarded.set(name, value);
  }
  const response = await target.handler(
    new Request(new URL(endpoint, env.APP_URL), {
      method: "POST",
      headers: forwarded,
      body: JSON.stringify(body),
    }),
  );
  const store = await cookies();
  parseSetCookieHeader(response.headers.get("set-cookie") ?? "").forEach((attributes, name) => {
    store.set(name, attributes.value, toCookieOptions(attributes));
  });
  return response.status;
}

function credentials(formData: FormData, prefix = "") {
  return {
    email: String(formData.get(`${prefix}email`) ?? ""),
    password: String(formData.get(`${prefix}password`) ?? ""),
  };
}

export async function spikeCustomerSignIn(formData: FormData): Promise<void> {
  const status = await postAndCopy(
    getCustomerAuth(),
    "/api/customer-auth/sign-in/email",
    credentials(formData),
  );
  redirect(`/spike-e07?signin=${status}`);
}

/** Customer sign-in through the handler, plus an owner `getSession` that renews a stale owner session. */
export async function spikeCustomerSignInAndRenewOwner(formData: FormData): Promise<void> {
  const status = await postAndCopy(
    getCustomerAuth(),
    "/api/customer-auth/sign-in/email",
    credentials(formData),
  );
  const owner = await getAuth().api.getSession({ headers: await headers() });
  redirect(`/spike-e07?signin=${status}&owner=${owner ? "yes" : "no"}`);
}

/** Both handlers in one action: two Set-Cookie headers must reach the response. */
export async function spikeSignInBoth(formData: FormData): Promise<void> {
  const customer = await postAndCopy(
    getCustomerAuth(),
    "/api/customer-auth/sign-in/email",
    credentials(formData),
  );
  const owner = await postAndCopy(getAuth(), "/api/auth/sign-in/email", credentials(formData, "owner_"));
  redirect(`/spike-e07?customer=${customer}&owner=${owner}`);
}

/** `auth.api.signOut` with `nextCookies()`: must expire only the customer cookie. */
export async function spikeCustomerSignOut(): Promise<void> {
  await getCustomerAuth().api.signOut({ headers: await headers() });
  redirect("/spike-e07?signout=1");
}
