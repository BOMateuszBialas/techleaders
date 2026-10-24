import Link from "next/link";
import { AccountOrderHint } from "@/components/account/account-order-not-found";
import { ORDER_NOT_FOUND_HEADING } from "@/components/checkout/checkout-copy";

/**
 * The same answer for a malformed and an unknown reference, and for an account order opened
 * without its customer's session (E07 A2): a guess reveals nothing (A8). The account hint is
 * shown on every not-found, so it reveals nothing either.
 */
export default function OrderNotFound() {
  return (
    <div className="flex flex-col gap-3">
      <h1 className="text-3xl font-semibold tracking-tight">{ORDER_NOT_FOUND_HEADING}</h1>
      <p className="text-muted-foreground">Check the reference and try again.</p>
      <AccountOrderHint />
      <Link href="/orders/lookup" className="w-fit text-sm underline underline-offset-4">
        Look up an order
      </Link>
    </div>
  );
}
