import { IconSearch } from "@tabler/icons-react";
import { CATALOG_SEARCH_MAX_LENGTH, type CatalogCategory } from "@commerceos/core";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { SEARCH_TOO_LONG_MESSAGE } from "./catalog-copy";

type CatalogSearchFormProps = {
  categories: CatalogCategory[];
  /** The current search term, pre-filled after a search. */
  search?: string;
  /** The current category slug, pre-selected; unknown slugs fall back to "All categories". */
  categorySlug?: string;
  /** True when `?q=` was too long; the message is tied to the input (spec Q14). */
  searchTooLong?: boolean;
};

/**
 * The listing's search form (spec S02, "Search form"): a plain GET form to `/products`, so it
 * works without client JavaScript and every result has a shareable URL. It is a small pill that
 * sits on the same row as the category pills (storefront visual polish, 2026-11-05). Only the term
 * is typed here: the category is chosen with the pills. A known category stays in the search as a
 * hidden field, so a search made on a category page stays in that category.
 */
export function CatalogSearchForm({
  categories,
  search,
  categorySlug,
  searchTooLong = false,
}: CatalogSearchFormProps) {
  const selected = categories.some((category) => category.slug === categorySlug)
    ? categorySlug
    : "";
  return (
    <form
      role="search"
      aria-label="Search the catalog"
      method="get"
      action="/products"
      className="flex w-full flex-col gap-1 sm:w-72"
    >
      <div className="relative flex items-center">
        <Label htmlFor="catalog-search-q" className="sr-only">
          Search term
        </Label>
        <Input
          id="catalog-search-q"
          name="q"
          type="search"
          maxLength={CATALOG_SEARCH_MAX_LENGTH}
          defaultValue={search ?? ""}
          placeholder="Search products"
          aria-invalid={searchTooLong || undefined}
          aria-describedby={searchTooLong ? "catalog-search-q-error" : undefined}
          className="h-9 rounded-full border-transparent bg-muted pr-11 pl-4 text-sm shadow-none focus-visible:bg-background focus-visible:ring-1 focus-visible:ring-muted-foreground/30 focus-visible:outline-none"
        />
        {selected ? <input type="hidden" name="category" value={selected} /> : null}
        <Button
          type="submit"
          variant="ghost"
          size="icon-sm"
          aria-label="Search"
          className="absolute top-1/2 right-3 -translate-y-1/2 rounded-full"
        >
          <IconSearch aria-hidden="true" />
        </Button>
      </div>
      {searchTooLong ? (
        <p id="catalog-search-q-error" className="text-sm text-destructive">
          {SEARCH_TOO_LONG_MESSAGE}
        </p>
      ) : null}
    </form>
  );
}
