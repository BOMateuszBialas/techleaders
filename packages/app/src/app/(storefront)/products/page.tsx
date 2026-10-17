import type { Metadata } from "next";
import { connection } from "next/server";
import { Suspense } from "react";
import { parseCatalogQuery } from "@commerceos/core";
import { CATALOG_UNAVAILABLE_MESSAGE } from "@/components/catalog/catalog-copy";
import { CatalogResults } from "@/components/catalog/catalog-results";
import { CatalogSearchForm } from "@/components/catalog/catalog-search-form";
import { CategoryNav } from "@/components/catalog/category-nav";
import { loadCatalogPage } from "./load-catalog-page";

export const metadata: Metadata = { title: "Products" };

/** Published products, optionally filtered by `?category=<slug>` and searched with `?q=<term>`. */
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
  const { categories, listing, unknownCategory } = result.data;
  return (
    <>
      <CatalogSearchForm
        categories={categories}
        search={query.q}
        categorySlug={query.category}
        searchTooLong={query.qError === "too_long"}
      />
      <CategoryNav
        categories={categories}
        activeSlug={listing ? (listing.category?.slug ?? null) : undefined}
        search={query.q}
      />
      <CatalogResults listing={listing} unknownCategory={unknownCategory} search={query.q} />
    </>
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
