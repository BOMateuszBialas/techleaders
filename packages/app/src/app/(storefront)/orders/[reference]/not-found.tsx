import Link from "next/link";
import { AccountOrderHint } from "@/components/account/account-order-not-found";
import {
  LOOKUP_ORDER_LINK,
  ORDER_NOT_FOUND_HEADING,
  ORDER_NOT_FOUND_HINT,
} from "@/components/checkout/checkout-copy";
import { buttonVariants } from "@/components/ui/button";
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyTitle,
} from "@/components/ui/empty";

/**
 * The same answer for a malformed and an unknown reference, and for an account order opened
 * without its customer's session (E07 A2): a guess reveals nothing (A8). The account hint is
 * shown on every not-found, so it reveals nothing either. The state is an `Empty` (retrofit
 * Phase 3, B3.23): the title holds the page's only `h1`, the action is an outline link.
 */
export default function OrderNotFound() {
  return (
    <div className="flex flex-col gap-3">
      <Empty>
        <EmptyHeader>
          <EmptyTitle>
            <h1>{ORDER_NOT_FOUND_HEADING}</h1>
          </EmptyTitle>
          <EmptyDescription>{ORDER_NOT_FOUND_HINT}</EmptyDescription>
        </EmptyHeader>
        <EmptyContent>
          <Link href="/orders/lookup" className={buttonVariants({ variant: "outline" })}>
            {LOOKUP_ORDER_LINK}
          </Link>
        </EmptyContent>
      </Empty>
      <AccountOrderHint />
    </div>
  );
}
