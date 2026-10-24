import Link from "next/link";
import { Button } from "@/components/ui/button";
import { ACCOUNT_COPY } from "./account-copy";

export type AccountOrdersViewProps = {
  email: string;
  signOutAction: () => void | Promise<void>;
};

/**
 * "My orders" for the signed-in customer (E07 spec, Phase 1): the signed-in email, "Sign out" and
 * the empty state. In this phase the empty state is the truth, because no order carries a
 * customer yet; Phase 2 adds the order table and its loading and error states.
 */
export function AccountOrdersView({ email, signOutAction }: AccountOrdersViewProps) {
  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-muted-foreground wrap-anywhere">
          Signed in as <span className="font-medium text-foreground">{email}</span>
        </p>
        <form action={signOutAction}>
          <Button type="submit" variant="outline" size="sm">
            {ACCOUNT_COPY.signOut}
          </Button>
        </form>
      </div>
      <div className="flex flex-col items-start gap-2 rounded-md border p-6">
        <p>{ACCOUNT_COPY.ordersEmpty}</p>
        <Link href="/products" className="text-sm underline underline-offset-4">
          {ACCOUNT_COPY.browseCatalog}
        </Link>
      </div>
      <p role="note" className="text-sm text-muted-foreground">
        {ACCOUNT_COPY.ordersNotSavedYet}
      </p>
    </div>
  );
}
