import Link from "next/link";
import type { CatalogCategory } from "@commerceos/core";
import { productsHref } from "@/components/catalog/catalog-copy";
import { buttonVariants } from "@/components/ui/button";
import { Disclosure, DisclosureContent, DisclosureTrigger } from "@/components/ui/disclosure";
import { HEADER_MENU_TRIGGER_LABEL } from "./storefront-copy";

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
 * The header menu (spec G13): "Shop all" and one link per category. From 768 px the links show
 * inline. Below 768 px they sit behind a "Categories" Disclosure button (P4, owner choice): a
 * native `<details>`, so no client JavaScript is needed. Only one of the two is displayed at a time.
 */
export function HeaderMenu({ categories }: HeaderMenuProps) {
  return (
    <div className="flex items-center gap-4">
      <nav aria-label="Main" className="hidden md:block">
        <ul className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-muted-foreground">
          <MenuLinks categories={categories} />
        </ul>
      </nav>
      <Disclosure className="relative md:hidden">
        <DisclosureTrigger className={buttonVariants({ variant: "outline" })}>
          {HEADER_MENU_TRIGGER_LABEL}
        </DisclosureTrigger>
        <DisclosureContent className="absolute right-0 z-10 mt-2">
          <nav aria-label="Main" className="w-56 rounded-md border bg-background p-3 shadow-md">
            <ul className="flex flex-col gap-2 text-sm text-muted-foreground">
              <MenuLinks categories={categories} />
            </ul>
          </nav>
        </DisclosureContent>
      </Disclosure>
      {/* The cart link with its count (cart spec) goes here. No placeholder ships before it
          works (spec G22). The search box sits beside this menu in the layout. */}
    </div>
  );
}
