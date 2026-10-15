import Link from "next/link";
import { connection } from "next/server";
import { Suspense } from "react";
import { CATALOG_UNAVAILABLE_MESSAGE } from "@/components/catalog/catalog-copy";
import { CategoryNav } from "@/components/catalog/category-nav";
import { buttonVariants } from "@/components/ui/button";
import { loadStorefrontCategories } from "./load-storefront-categories";

/** Storefront home: an introduction and the category list. Phase 1b turns it into a shop front. */
export default function HomePage() {
  return (
    <>
      <div className="flex flex-col gap-3">
        <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">
          Welcome to the CommerceOS demo store
        </h1>
        <p className="max-w-prose text-muted-foreground">
          Specialty coffee and brewing gear. Browse the catalog by category or see everything at
          once.
        </p>
        <Link href="/products" className={buttonVariants({ className: "w-fit" })}>
          Shop all products
        </Link>
      </div>
      <section aria-labelledby="categories-heading" className="flex flex-col gap-3">
        <h2 id="categories-heading" className="text-xl font-semibold tracking-tight">
          Shop by category
        </h2>
        <Suspense fallback={<p className="text-sm text-muted-foreground">Loading categories…</p>}>
          <HomeCategories />
        </Suspense>
      </section>
    </>
  );
}

async function HomeCategories() {
  await connection();
  const result = await loadStorefrontCategories();

  if (result.kind !== "ok") {
    return (
      <p role="alert" className="text-sm text-destructive">
        {CATALOG_UNAVAILABLE_MESSAGE}
      </p>
    );
  }
  if (result.data.length === 0) {
    return <p className="text-sm text-muted-foreground">No categories yet.</p>;
  }
  return <CategoryNav categories={result.data} />;
}
