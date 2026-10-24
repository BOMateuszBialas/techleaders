import { IconUser } from "@tabler/icons-react";
import Link from "next/link";
import { ACCOUNT_COPY } from "./account-copy";

export type AccountHeaderLinkProps = {
  /** Whether a customer session was read for this request (spec A21, A24). */
  signedIn: boolean;
  signOutAction: () => void | Promise<void>;
};

const LINK_CLASS =
  "inline-flex items-center gap-1.5 rounded-md border px-3 py-1 text-sm whitespace-nowrap hover:bg-muted focus-visible:bg-muted";

/**
 * The storefront header's account entry (spec A21): "Sign in" for a signed-out shopper (also
 * when the session read failed, A24), or "My orders" plus "Sign out". Rendered at request time
 * inside `<Suspense>`, never inside `use cache` (A23).
 */
export function AccountHeaderLink({ signedIn, signOutAction }: AccountHeaderLinkProps) {
  if (!signedIn) {
    return (
      <Link href="/account/sign-in" className={LINK_CLASS}>
        <IconUser aria-hidden="true" className="size-4" /> {ACCOUNT_COPY.signIn}
      </Link>
    );
  }
  return (
    <div className="flex items-center gap-2">
      <Link href="/account/orders" className={LINK_CLASS}>
        <IconUser aria-hidden="true" className="size-4" /> {ACCOUNT_COPY.myOrders}
      </Link>
      <form action={signOutAction}>
        <button
          type="submit"
          className="text-sm whitespace-nowrap text-muted-foreground underline-offset-4 hover:underline"
        >
          {ACCOUNT_COPY.signOut}
        </button>
      </form>
    </div>
  );
}
