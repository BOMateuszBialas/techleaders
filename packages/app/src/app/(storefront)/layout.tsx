import Link from "next/link";
import { connection } from "next/server";
import { Suspense } from "react";
import { cartItemCount } from "@commerceos/core";
import { AccountHeaderLink } from "@/components/account/account-header-link";
import { CartLink } from "@/components/cart/cart-link";
import { FooterCategoryLinks, SiteFooter } from "@/components/storefront/site-footer";
import { HeaderMenu } from "@/components/storefront/header-menu";
import { HeaderSearch } from "@/components/storefront/header-search";
import { STORE_NAME } from "@/components/storefront/storefront-copy";
import { readCartLines } from "@/server/cart/cart-cookie";
import { signOutCustomer } from "@/server/customer-auth/customer-auth.action";
import { isCustomerSignedIn } from "@/server/customer-auth/require-customer";
import { loadStorefrontCategories } from "./load-storefront-categories";

/**
 * Storefront shell shared by the home page, the listing and product pages: header search box,
 * menu (spec G13), the cart link with its count (cart spec G9), the customer account link (E07
 * spec A21) and footer (G14). No demo banner (storefront v2, R11). The shell itself prerenders;
 * the category links and the cart count are read at request time inside `<Suspense>`. Without
 * categories (still loading, or the catalog is unavailable) the menus keep their static links.
 */
export default function StorefrontLayout({ children }: LayoutProps<"/">) {
  return (
    <div className="flex flex-1 flex-col">
      <header className="border-b">
        <div className="mx-auto flex min-h-14 w-full max-w-6xl flex-wrap items-center justify-between gap-x-4 gap-y-2 px-4 py-2 sm:h-14 sm:flex-nowrap sm:py-0">
          <Link href="/" className="font-semibold tracking-tight">
            {STORE_NAME}
          </Link>
          {/* On a phone the actions take their own full-width row, so the cart stays in view; from
              `sm` the header keeps one fixed-height row, so streamed menu links never shift the page. */}
          <div className="flex w-full items-center gap-3 sm:w-auto">
            <HeaderSearch />
            <Suspense fallback={<HeaderMenu categories={[]} />}>
              <LoadedHeaderMenu />
            </Suspense>
            <Suspense fallback={<CartLink itemCount={null} />}>
              <LoadedCartLink />
            </Suspense>
            <Suspense fallback={null}>
              <LoadedAccountLink />
            </Suspense>
          </div>
        </div>
      </header>
      <main className="mx-auto flex w-full max-w-6xl flex-1 flex-col gap-6 px-4 py-10">
        {children}
      </main>
      <SiteFooter
        categoryLinks={
          <Suspense fallback={<FooterCategoryLinks categories={[]} />}>
            <LoadedFooterCategoryLinks />
          </Suspense>
        }
      />
    </div>
  );
}

async function LoadedHeaderMenu() {
  await connection();
  const result = await loadStorefrontCategories();
  return <HeaderMenu categories={result.kind === "ok" ? result.data : []} />;
}

/**
 * The cart count comes from the cookie only (no database read, cart spec UI/UX). It does not log
 * an invalid cookie: every storefront page renders it, and the cart page already does (#48).
 */
async function LoadedCartLink() {
  return <CartLink itemCount={cartItemCount(await readCartLines({ logInvalid: false }))} />;
}

/**
 * "Sign in" or "My orders" + "Sign out" (A21), read per request from the customer session and
 * never cached (A23). A session-read failure shows "Sign in" (A24): the header never breaks.
 */
async function LoadedAccountLink() {
  return (
    <AccountHeaderLink signedIn={await isCustomerSignedIn()} signOutAction={signOutCustomer} />
  );
}

async function LoadedFooterCategoryLinks() {
  await connection();
  const result = await loadStorefrontCategories();
  return <FooterCategoryLinks categories={result.kind === "ok" ? result.data : []} />;
}
