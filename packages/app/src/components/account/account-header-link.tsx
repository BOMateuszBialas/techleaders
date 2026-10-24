import { IconLogout, IconUser } from "@tabler/icons-react";
import Link from "next/link";
import { ACCOUNT_COPY } from "./account-copy";

export type AccountHeaderLinkProps = {
  /** Whether a customer session was read for this request (spec A21, A24). */
  signedIn: boolean;
  signOutAction: () => void | Promise<void>;
};

const CONTROL_CLASS =
  "inline-flex items-center gap-1.5 rounded-md border px-2 py-1 text-sm whitespace-nowrap hover:bg-muted focus-visible:bg-muted sm:px-3";
/** On a phone only the icon shows (the header row must fit 390 px); the name stays for readers. */
const LABEL_CLASS = "sr-only sm:not-sr-only sm:whitespace-nowrap";

/**
 * The storefront header's account entry (spec A21): "Sign in" for a signed-out shopper (also
 * when the session read failed, A24), or "My orders" plus "Sign out". Rendered at request time
 * inside `<Suspense>`, never inside `use cache` (A23).
 */
export function AccountHeaderLink({ signedIn, signOutAction }: AccountHeaderLinkProps) {
  if (!signedIn) {
    return (
      <Link href="/account/sign-in" className={CONTROL_CLASS}>
        <IconUser aria-hidden="true" className="size-4" />
        <span className={LABEL_CLASS}>{ACCOUNT_COPY.signIn}</span>
      </Link>
    );
  }
  return (
    <div className="flex items-center gap-2">
      <Link href="/account/orders" className={CONTROL_CLASS}>
        <IconUser aria-hidden="true" className="size-4" />
        <span className={LABEL_CLASS}>{ACCOUNT_COPY.myOrders}</span>
      </Link>
      <form action={signOutAction}>
        <button type="submit" className={CONTROL_CLASS}>
          <IconLogout aria-hidden="true" className="size-4" />
          <span className={LABEL_CLASS}>{ACCOUNT_COPY.signOut}</span>
        </button>
      </form>
    </div>
  );
}
