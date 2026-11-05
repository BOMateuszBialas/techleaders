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
      className="relative flex min-w-0 items-center"
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
        className="h-9 w-full rounded-full border-transparent bg-muted pr-11 pl-4 text-sm shadow-none focus-visible:border-transparent focus-visible:bg-background focus-visible:shadow-none focus-visible:ring-1 focus-visible:ring-muted-foreground/30 focus-visible:outline-none sm:w-56"
      />
      <Button
        type="submit"
        variant="ghost"
        size="icon-sm"
        aria-label="Search"
        className="absolute top-1/2 right-3 -translate-y-1/2 rounded-full"
      >
        <IconSearch aria-hidden="true" />
      </Button>
    </form>
  );
}
