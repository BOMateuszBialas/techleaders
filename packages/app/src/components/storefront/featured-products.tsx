import Link from "next/link";
import type { CatalogCategory, CatalogProductSummary } from "@commerceos/core";
import { cn } from "cn";
import { productsHref } from "@/components/catalog/catalog-copy";
import { ProductCard } from "@/components/catalog/product-card";
import { featuredEmptyMessage } from "./storefront-copy";

type Tab = { key: string; label: string; href: string; active: boolean };

/** Category tabs above the slider, rendered as plain links (spec G11). */
export function FeaturedTabs({ tabs }: { tabs: Tab[] }) {
  return (
    <nav aria-label="Featured categories">
      <ul className="flex flex-wrap gap-2 text-sm">
        {tabs.map((tab) => (
          <li key={tab.key}>
            <Link
              href={tab.href}
              scroll={false}
              aria-current={tab.active ? "page" : undefined}
              className={cn(
                "inline-block rounded-full border px-3 py-1 hover:bg-muted focus-visible:bg-muted",
                tab.active && "bg-primary text-primary-foreground hover:bg-primary/90",
              )}
            >
              {tab.label}
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  );
}

type FeaturedSliderProps = {
  /** The active tab's category, or null for "All". */
  category: CatalogCategory | null;
  products: CatalogProductSummary[];
};

/**
 * A horizontally scrolling row of product cards with CSS scroll snapping: no JavaScript, no
 * carousel library and no arrows (spec G10). With nothing featured it says so and links to
 * the listing instead of substituting other products (G17).
 */
export function FeaturedSlider({ category, products }: FeaturedSliderProps) {
  if (products.length === 0) {
    return (
      <div className="flex flex-col gap-2">
        <p>{featuredEmptyMessage(category)}</p>
        <Link
          href={productsHref(category?.slug)}
          className="w-fit text-sm underline underline-offset-4"
        >
          {category ? `Browse all ${category.name}` : "Browse all products"}
        </Link>
      </div>
    );
  }
  return (
    <ul
      aria-label="Featured products"
      className="flex snap-x snap-mandatory gap-4 overflow-x-auto pb-4"
    >
      {products.map((product) => (
        <li key={product.id} className="w-64 shrink-0 snap-start">
          <ProductCard product={product} />
        </li>
      ))}
    </ul>
  );
}
