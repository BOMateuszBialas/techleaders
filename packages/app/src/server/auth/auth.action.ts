"use server";

import { redirect } from "next/navigation";
import { SIGN_IN_PAGE } from "./require-admin";
import { ADMIN_HOME, attemptSignIn, attemptSignOut } from "./sign-in";

// Only these two actions are exported: every export of a "use server" file is a public
// endpoint. redirect() runs outside any try/catch, so it is never swallowed.

export async function signIn(formData: FormData): Promise<void> {
  const outcome = await attemptSignIn(formData);
  redirect(outcome === "ok" ? ADMIN_HOME : `${SIGN_IN_PAGE}?error=${outcome}`);
}

export async function signOut(): Promise<void> {
  await attemptSignOut();
  redirect(SIGN_IN_PAGE);
}
