import { SearchIcon } from "lucide-react";
import { CATALOG_SEARCH_MAX_LENGTH } from "@commerceos/core";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

/**
 * The header's search box (spec G13): a plain GET form to `/products?q=…`, so it works without
 * client JavaScript. It is static (the layout has no search params); the listing's own form
 * shows the current term and adds the category filter.
 */
export function HeaderSearch() {
  return (
    <form
      role="search"
      aria-label="Site search"
      method="get"
      action="/products"
      className="flex items-center gap-1"
    >
      <label htmlFor="header-search-q" className="sr-only">
        Search products
      </label>
      <Input
        id="header-search-q"
        name="q"
        type="search"
        maxLength={CATALOG_SEARCH_MAX_LENGTH}
        placeholder="Search products"
        className="w-28 sm:w-48"
      />
      <Button type="submit" variant="outline" size="icon" aria-label="Search">
        <SearchIcon aria-hidden="true" />
      </Button>
    </form>
  );
}
