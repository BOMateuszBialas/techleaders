import Link from "next/link";
import { ACCOUNT_COPY, CUSTOMER_SIGN_IN_FROM_CHECKOUT } from "./account-copy";

/**
 * The checkout's account line (spec A16, Phase 1): a signed-out shopper (or one whose session
 * read failed) sees "Sign in for order history", which returns to checkout after signing in
 * (A17). Guest checkout itself is unchanged. Until Phase 2b attaches orders to accounts, a
 * signed-in customer is told plainly that this order is still a guest order (principle 6, A3);
 * Phase 2 replaces this with the account mode of A24.
 */
export function CheckoutAccountNote({ signedIn }: { signedIn: boolean }) {
  if (signedIn) {
    return (
      <p role="note" className="text-sm text-muted-foreground">
        {ACCOUNT_COPY.ordersNotSavedYet}
      </p>
    );
  }
  return (
    <p className="text-sm text-muted-foreground">
      <Link href={CUSTOMER_SIGN_IN_FROM_CHECKOUT} className="underline underline-offset-4">
        {ACCOUNT_COPY.checkoutSignIn}
      </Link>{" "}
      {ACCOUNT_COPY.checkoutSignInHint}
    </p>
  );
}
