import Link from "next/link";
import type { ReactNode } from "react";
import type { CatalogCategory } from "@commerceos/core";
import { ThemeToggle } from "@/components/theme/theme-toggle";
import { productsHref } from "@/components/catalog/catalog-copy";
import { DEMO_NOTICE, STORE_NAME, STORE_TAGLINE } from "./storefront-copy";

const LINK = "hover:text-foreground hover:underline focus-visible:underline";

/** "All products" plus one link per category, for the footer. */
export function FooterCategoryLinks({ categories }: { categories: CatalogCategory[] }) {
  return (
    <ul className="flex flex-col gap-1">
      <li>
        <Link href={productsHref()} className={LINK}>
          All products
        </Link>
      </li>
      {categories.map((category) => (
        <li key={category.slug}>
          <Link href={productsHref(category.slug)} className={LINK}>
            {category.name}
          </Link>
        </li>
      ))}
    </ul>
  );
}

/**
 * Storefront footer (spec G14): store name and one line about it, category links, the owner
 * sign-in link (moved here from the header), the demo notice (R07) and the copyright. There
 * are no placeholder pages such as About or Contact. `categoryLinks` is streamed in by the
 * layout, because categories are read at request time.
 */
export function SiteFooter({ categoryLinks }: { categoryLinks: ReactNode }) {
  return (
    <footer className="border-t bg-muted/40">
      <div className="mx-auto grid w-full max-w-6xl gap-8 px-4 py-10 text-sm text-muted-foreground sm:grid-cols-3">
        <div className="flex flex-col gap-2">
          <p className="font-semibold text-foreground">{STORE_NAME}</p>
          <p>{STORE_TAGLINE}</p>
        </div>
        <nav aria-label="Footer categories" className="flex flex-col gap-2">
          <p className="font-semibold text-foreground">Shop</p>
          {categoryLinks}
        </nav>
        <div className="flex flex-col gap-2">
          <p className="font-semibold text-foreground">Store owner</p>
          <Link href="/admin" className={LINK}>
            Owner sign-in
          </Link>
          <ThemeToggle />
        </div>
      </div>
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-1 border-t px-4 py-4 text-xs text-muted-foreground">
        <p>{DEMO_NOTICE}</p>
        <p>© 2026 {STORE_NAME} demo store.</p>
      </div>
    </footer>
  );
}
