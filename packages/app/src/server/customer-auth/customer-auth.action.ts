"use server";

import { redirect } from "next/navigation";
import { customerAuthPageHref, customerReturnPath } from "./customer-auth-errors";
import { attemptCustomerSignIn } from "./customer-sign-in";
import { attemptCustomerSignOut } from "./customer-sign-out";
import { attemptCustomerSignUp } from "./customer-sign-up";

// Only these three actions are exported: every export of a "use server" file is a public
// endpoint. Like the owner's sign-in actions, they are a documented exception to the guard
// inventory (they create or end the session). redirect() runs outside any try/catch, so it is
// never swallowed. The return path is chosen only by the fixed code `from=checkout` (A17).

export async function signUpCustomer(formData: FormData): Promise<void> {
  const from = formData.get("from");
  const outcome = await attemptCustomerSignUp(formData);
  redirect(
    outcome === "ok"
      ? customerReturnPath(from)
      : customerAuthPageHref("/account/sign-up", { error: outcome, from }),
  );
}

export async function signInCustomer(formData: FormData): Promise<void> {
  const from = formData.get("from");
  const outcome = await attemptCustomerSignIn(formData);
  redirect(
    outcome === "ok"
      ? customerReturnPath(from)
      : customerAuthPageHref("/account/sign-in", { error: outcome, from }),
  );
}

export async function signOutCustomer(): Promise<void> {
  await attemptCustomerSignOut();
  redirect("/");
}
