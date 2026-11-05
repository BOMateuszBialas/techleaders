import { Suspense } from "react";
import { MenuLinks } from "./header-menu-links";
import { MobileCategoriesMenu } from "./mobile-categories-menu";
import type { CatalogCategory } from "@commerceos/core";

type HeaderMenuProps = {
  /** Every category (spec G13: all of them; a cap is a later decision). Empty while loading. */
  categories: CatalogCategory[];
};

/**
 * The header menu (spec G13): "Shop all" and one link per category. From 768 px the links show
 * inline. Below 768 px they open from a burger button in a sheet from the left edge
 * (`MobileCategoriesMenu`). Only one of the two is displayed at a time.
 */
export function HeaderMenu({ categories }: HeaderMenuProps) {
  return (
    <div className="flex items-center gap-4">
      <nav aria-label="Main" className="hidden md:block">
        <ul className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-muted-foreground">
          <MenuLinks categories={categories} />
        </ul>
      </nav>
      <div className="md:hidden">
        {/* The menu reads the route, so it streams: the static shell keeps a button-sized gap. */}
        <Suspense fallback={<span className="block size-11" aria-hidden="true" />}>
          <MobileCategoriesMenu categories={categories} />
        </Suspense>
      </div>
      {/* The cart link with its count (cart spec) goes here. No placeholder ships before it
          works (spec G22). The search box sits beside this menu in the layout. */}
    </div>
  );
}
