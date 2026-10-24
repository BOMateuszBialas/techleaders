import Link from "next/link";
import { Suspense } from "react";
import {
  spikeCustomerSignIn,
  spikeCustomerSignInAndRenewOwner,
  spikeCustomerSignOut,
  spikeSignInBoth,
} from "@/server/customer-auth/spike.action";
import { SessionPanel } from "./session-panel";

export default function SpikePage() {
  return (
    <main>
      <h1>E07 spike</h1>
      <Suspense fallback={<p>page: loading</p>}>
        <SessionPanel where="page" />
      </Suspense>
      <Link href="/spike-e07/other" prefetch={true}>
        Other page
      </Link>
      <form id="customer-sign-in" action={spikeCustomerSignIn}>
        <input aria-label="Customer email" name="email" />
        <input aria-label="Customer password" name="password" type="password" />
        <button type="submit">Customer sign in</button>
      </form>
      <form id="customer-sign-in-renew" action={spikeCustomerSignInAndRenewOwner}>
        <input name="email" />
        <input name="password" type="password" />
        <button type="submit">Customer sign in and renew owner</button>
      </form>
      <form id="both" action={spikeSignInBoth}>
        <input name="email" />
        <input name="password" type="password" />
        <input name="owner_email" />
        <input name="owner_password" type="password" />
        <button type="submit">Both sign in</button>
      </form>
      <form id="customer-sign-out" action={spikeCustomerSignOut}>
        <button type="submit">Customer sign out</button>
      </form>
    </main>
  );
}
