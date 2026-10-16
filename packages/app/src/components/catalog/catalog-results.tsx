import Link from "next/link";
import type { CatalogListing } from "@commerceos/core";
import {
  emptyListingMessage,
  listingHeading,
  listingLimitNotice,
  productsHref,
  resultCountText,
} from "./catalog-copy";
import { ProductCard } from "./product-card";

type CatalogResultsProps = {
  /** null when no product query ran (see `unknownCategory`). */
  listing: CatalogListing | null;
  /** The requested category is unknown or malformed (spec Q11). */
  unknownCategory: boolean;
  /** The current search term, if any. */
  search?: string;
};

/**
 * The listing area of `/products`: the heading with the result count and the products, or the
 * empty, "no results" (with "Clear search") or unknown-category state. Renders nothing when no
 * query ran for another reason (a too-long search term, shown at the search input).
 */
export function CatalogResults({ listing, unknownCategory, search }: CatalogResultsProps) {
  if (unknownCategory) {
    return (
      <div className="flex flex-col gap-2">
        <p>This category does not exist.</p>
        <ListingLink href={productsHref()}>Browse all products</ListingLink>
      </div>
    );
  }
  if (!listing) return null;

  const notice = listingLimitNotice(listing.products.length, listing.total);
  return (
    <section aria-labelledby="listing-heading" className="flex flex-col gap-4">
      <div className="flex flex-col gap-1">
        <h2 id="listing-heading" className="text-xl font-semibold tracking-tight">
          {listingHeading(listing.category, search)}
        </h2>
        <p className="text-sm text-muted-foreground">{resultCountText(listing.total)}</p>
      </div>
      {listing.products.length === 0 ? (
        <div className="flex flex-col gap-2">
          <p>{emptyListingMessage(listing.category, search)}</p>
          {search ? (
            <ListingLink href={productsHref(listing.category?.slug)}>Clear search</ListingLink>
          ) : listing.category ? (
            <ListingLink href={productsHref()}>Browse all products</ListingLink>
          ) : null}
        </div>
      ) : (
        <>
          {notice ? <p className="text-sm text-muted-foreground">{notice}</p> : null}
          <ul className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {listing.products.map((product) => (
              <li key={product.id}>
                <ProductCard product={product} />
              </li>
            ))}
          </ul>
        </>
      )}
    </section>
  );
}

function ListingLink({ href, children }: { href: string; children: string }) {
  return (
    <Link href={href} className="w-fit text-sm underline underline-offset-4">
      {children}
    </Link>
  );
}
