import Link from "next/link";
import { connection } from "next/server";
import { Suspense } from "react";
import { cartItemCount } from "@commerceos/core";
import { CartLink } from "@/components/cart/cart-link";
import { FooterCategoryLinks, SiteFooter } from "@/components/storefront/site-footer";
import { HeaderMenu } from "@/components/storefront/header-menu";
import { HeaderSearch } from "@/components/storefront/header-search";
import { DEMO_NOTICE, STORE_NAME } from "@/components/storefront/storefront-copy";
import { readCartLines } from "@/server/cart/cart-cookie";
import { loadStorefrontCategories } from "./load-storefront-categories";

/**
 * Storefront shell shared by the home page, the listing and product pages: demo banner (R07),
 * header search box, menu (spec G13), the cart link with its count (cart spec G9) and footer
 * (G14). The shell itself prerenders; the category links and the cart count are read at request
 * time inside `<Suspense>`. Without categories (still loading, or the catalog is unavailable)
 * the menus keep their static links.
 */
export default function StorefrontLayout({ children }: LayoutProps<"/">) {
  return (
    <div className="flex flex-1 flex-col">
      <p role="note" className="bg-amber-100 px-4 py-2 text-center text-sm text-amber-950">
        {DEMO_NOTICE}
      </p>
      <header className="border-b">
        <div className="mx-auto flex h-14 w-full max-w-6xl items-center justify-between gap-4 px-4">
          <Link href="/" className="font-semibold tracking-tight">
            {STORE_NAME}
          </Link>
          <div className="flex items-center gap-3">
            <HeaderSearch />
            <Suspense fallback={<HeaderMenu categories={[]} />}>
              <LoadedHeaderMenu />
            </Suspense>
            <Suspense fallback={<CartLink itemCount={null} />}>
              <LoadedCartLink />
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

/** The cart count comes from the cookie only (no database read, cart spec UI/UX). */
async function LoadedCartLink() {
  return <CartLink itemCount={cartItemCount(await readCartLines())} />;
}

async function LoadedFooterCategoryLinks() {
  await connection();
  const result = await loadStorefrontCategories();
  return <FooterCategoryLinks categories={result.kind === "ok" ? result.data : []} />;
}
