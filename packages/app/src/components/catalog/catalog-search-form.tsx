import { CATALOG_SEARCH_MAX_LENGTH, type CatalogCategory } from "@commerceos/core";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { SEARCH_TOO_LONG_MESSAGE } from "./catalog-copy";

const SELECT_CLASS =
  "h-8 w-full rounded-lg border border-input bg-transparent px-2 text-base outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 md:text-sm dark:bg-input/30";

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
 * works without client JavaScript and every result has a shareable URL. The term and the
 * category combine as AND.
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
      className="flex flex-col gap-3 sm:flex-row sm:items-end"
    >
      <div className="flex flex-1 flex-col gap-1.5">
        <Label htmlFor="catalog-search-q">Search term</Label>
        <Input
          id="catalog-search-q"
          name="q"
          type="search"
          maxLength={CATALOG_SEARCH_MAX_LENGTH}
          defaultValue={search ?? ""}
          placeholder="Name or description"
          aria-invalid={searchTooLong || undefined}
          aria-describedby={searchTooLong ? "catalog-search-q-error" : undefined}
        />
        {searchTooLong ? (
          <p id="catalog-search-q-error" className="text-sm text-destructive">
            {SEARCH_TOO_LONG_MESSAGE}
          </p>
        ) : null}
      </div>
      <div className="flex flex-col gap-1.5 sm:w-56">
        <Label htmlFor="catalog-search-category">Category</Label>
        <select
          id="catalog-search-category"
          name="category"
          className={SELECT_CLASS}
          defaultValue={selected}
        >
          <option value="">All categories</option>
          {categories.map((category) => (
            <option key={category.slug} value={category.slug}>
              {category.name}
            </option>
          ))}
        </select>
      </div>
      <Button type="submit">Search</Button>
    </form>
  );
}
