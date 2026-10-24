import { IconSearch } from "@tabler/icons-react";
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
      className="flex min-w-0 flex-1 items-center gap-1 sm:flex-none"
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
        className="min-w-0 flex-1 sm:w-48 sm:flex-none"
      />
      <Button type="submit" variant="outline" size="icon" aria-label="Search">
        <IconSearch aria-hidden="true" />
      </Button>
    </form>
  );
}
