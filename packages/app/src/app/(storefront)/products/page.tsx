import type { Metadata } from "next";
import Link from "next/link";
import { connection } from "next/server";
import { Suspense } from "react";
import { parseCatalogQuery, type CatalogListing } from "@commerceos/core";
import {
  CATALOG_UNAVAILABLE_MESSAGE,
  emptyListingMessage,
  listingLimitNotice,
} from "@/components/catalog/catalog-copy";
import { CategoryNav } from "@/components/catalog/category-nav";
import { ProductCard } from "@/components/catalog/product-card";
import { loadCatalogPage } from "./load-catalog-page";

export const metadata: Metadata = { title: "Products" };

/** Published products, optionally filtered by `?category=<slug>`. */
export default function ProductsPage({ searchParams }: PageProps<"/products">) {
  return (
    <>
      <h1 className="text-3xl font-semibold tracking-tight">Products</h1>
      <Suspense fallback={<ListingSkeleton />}>
        <CatalogListingSection searchParams={searchParams} />
      </Suspense>
    </>
  );
}

async function CatalogListingSection({
  searchParams,
}: {
  searchParams: PageProps<"/products">["searchParams"];
}) {
  const query = parseCatalogQuery(await searchParams);
  await connection();
  const result = await loadCatalogPage(query);

  if (result.kind !== "ok") {
    return (
      <p role="alert" className="text-sm text-destructive">
        {CATALOG_UNAVAILABLE_MESSAGE}
      </p>
    );
  }
  const { categories, listing } = result.data;
  return (
    <>
      <CategoryNav
        categories={categories}
        activeSlug={listing ? (listing.category?.slug ?? null) : undefined}
      />
      {listing ? <ProductListing listing={listing} /> : <UnknownCategory />}
    </>
  );
}

function ProductListing({ listing }: { listing: CatalogListing }) {
  const notice = listingLimitNotice(listing.products.length, listing.total);
  return (
    <section aria-labelledby="listing-heading" className="flex flex-col gap-4">
      <h2 id="listing-heading" className="text-xl font-semibold tracking-tight">
        {listing.category?.name ?? "All products"}
      </h2>
      {listing.products.length === 0 ? (
        <div className="flex flex-col gap-2">
          <p>{emptyListingMessage(listing.category)}</p>
          {listing.category ? <AllProductsLink /> : null}
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

function UnknownCategory() {
  return (
    <div className="flex flex-col gap-2">
      <p>This category does not exist.</p>
      <AllProductsLink />
    </div>
  );
}

function AllProductsLink() {
  return (
    <Link href="/products" className="w-fit text-sm underline underline-offset-4">
      Browse all products
    </Link>
  );
}

function ListingSkeleton() {
  return (
    <ul
      aria-label="Loading products"
      className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3"
    >
      {[0, 1, 2].map((key) => (
        <li key={key} className="h-80 animate-pulse rounded-lg border bg-muted" />
      ))}
    </ul>
  );
}
