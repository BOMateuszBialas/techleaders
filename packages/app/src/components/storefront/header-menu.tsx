import Link from "next/link";
import type { CatalogCategory } from "@commerceos/core";
import { productsHref } from "@/components/catalog/catalog-copy";

type HeaderMenuProps = {
  /** Every category (spec G13: all of them; a cap is a later decision). Empty while loading. */
  categories: CatalogCategory[];
};

function MenuLinks({ categories }: HeaderMenuProps) {
  return (
    <>
      <li>
        <Link href={productsHref()} className="hover:text-foreground focus-visible:underline">
          Shop all
        </Link>
      </li>
      {categories.map((category) => (
        <li key={category.slug}>
          <Link
            href={productsHref(category.slug)}
            className="hover:text-foreground focus-visible:underline"
          >
            {category.name}
          </Link>
        </li>
      ))}
    </>
  );
}

/**
 * The header menu (spec G13): "Shop all" and one link per category. Wide screens show it
 * inline; narrow screens get a native `<details>` disclosure, so no client JavaScript is
 * needed. Only one of the two is displayed at a time.
 */
export function HeaderMenu({ categories }: HeaderMenuProps) {
  return (
    <div className="flex items-center gap-4">
      <nav aria-label="Main" className="hidden md:block">
        <ul className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-muted-foreground">
          <MenuLinks categories={categories} />
        </ul>
      </nav>
      <details className="relative md:hidden">
        <summary className="cursor-pointer list-none rounded-md border px-3 py-1 text-sm hover:bg-muted focus-visible:bg-muted [&::-webkit-details-marker]:hidden">
          <span aria-hidden="true">☰</span> Menu
        </summary>
        <nav
          aria-label="Main"
          className="absolute right-0 z-10 mt-2 w-56 rounded-md border bg-background p-3 shadow-md"
        >
          <ul className="flex flex-col gap-2 text-sm text-muted-foreground">
            <MenuLinks categories={categories} />
          </ul>
        </nav>
      </details>
      {/* The search box (storefront spec Phase 2) and the cart link with its count (cart
          spec) go here. No placeholder ships before they work (spec G22). */}
    </div>
  );
}
