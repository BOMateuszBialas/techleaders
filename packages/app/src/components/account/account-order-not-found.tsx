import Link from "next/link";
import { ACCOUNT_COPY, ACCOUNT_ORDERS_PATH } from "./account-copy";

/**
 * The account area's "not found" (E07 spec A11): one text for a malformed, an unknown and another
 * customer's order id, so a guess reveals nothing.
 */
export function AccountOrderNotFound() {
  return (
    <div className="flex flex-col gap-3">
      <h1 className="text-3xl font-semibold tracking-tight">{ACCOUNT_COPY.orderNotFound}</h1>
      <p className="text-muted-foreground">{ACCOUNT_COPY.orderNotFoundHint}</p>
      <Link href={ACCOUNT_ORDERS_PATH} className="w-fit text-sm underline underline-offset-4">
        {ACCOUNT_COPY.backToOrders}
      </Link>
    </div>
  );
}

/**
 * The line every reference "not found" page adds (E07 spec Architecture): unconditional, so it
 * says nothing about whether the reference exists or belongs to an account.
 */
export function AccountOrderHint() {
  return <p className="text-sm text-muted-foreground">{ACCOUNT_COPY.accountOrderHint}</p>;
}
