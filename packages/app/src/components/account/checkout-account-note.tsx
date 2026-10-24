import Link from "next/link";
import { ACCOUNT_COPY, CUSTOMER_SIGN_IN_FROM_CHECKOUT } from "./account-copy";

/**
 * The checkout's account line (spec A16, Phase 1): a signed-out shopper (or one whose session
 * read failed) sees "Sign in for order history", which returns to checkout after signing in
 * (A17). Guest checkout itself is unchanged; a signed-in customer sees nothing here yet (Phase 2
 * shows the account mode, A24).
 */
export function CheckoutAccountNote({ signedIn }: { signedIn: boolean }) {
  if (signedIn) return null;
  return (
    <p className="text-sm text-muted-foreground">
      <Link href={CUSTOMER_SIGN_IN_FROM_CHECKOUT} className="underline underline-offset-4">
        {ACCOUNT_COPY.checkoutSignIn}
      </Link>{" "}
      {ACCOUNT_COPY.checkoutSignInHint}
    </p>
  );
}
