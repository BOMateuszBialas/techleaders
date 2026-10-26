import { connection } from "next/server";
import { Suspense } from "react";
import { CATALOG_UNAVAILABLE_MESSAGE } from "@/components/catalog/catalog-copy";
import { BestSellers } from "@/components/storefront/best-sellers";
import { CategoryTiles } from "@/components/storefront/category-tiles";
import { FeaturedSlider, FeaturedTabs } from "@/components/storefront/featured-products";
import { HomeHero } from "@/components/storefront/home-hero";
import { HomeSectionUnavailable } from "@/components/storefront/home-section-unavailable";
import { LowStockBannerItem, PromoBannerItem } from "@/components/storefront/promo-banners";
import { PROMO_BANNERS, WHY_BUY_HERE } from "@/components/storefront/storefront-content";
import { WhyBuyHere } from "@/components/storefront/why-buy-here";
import { loadHomePage } from "./load-home-page";
import { loadBestSellerNames, loadCategoryCounts, loadLowStockProduct } from "./load-home-sections";

/**
 * Storefront home (storefront v2 Phase 4), in the approved order: hero, featured products
 * (unchanged slider, Q15), promo banners, category tiles, "Why buy here", best sellers. Each
 * data section loads on its own, so one failing section shows its own message and the rest of
 * the page still renders. The thin async components below only call the loaders and the views.
 */
export default function HomePage({ searchParams }: PageProps<"/">) {
  return (
    <div className="flex flex-col gap-12">
      <HomeHero />
      <section aria-labelledby="featured-heading" className="flex flex-col gap-4">
        <h2 id="featured-heading" className="text-xl font-semibold tracking-tight">
          Featured products
        </h2>
        <Suspense fallback={<FeaturedSkeleton />}>
          <FeaturedSection searchParams={searchParams} />
        </Suspense>
      </section>
      <section aria-labelledby="home-highlights" className="flex flex-col gap-4">
        <h2 id="home-highlights" className="text-xl font-semibold tracking-tight">
          From the store
        </h2>
        <ul className="grid gap-4 md:grid-cols-3">
          {PROMO_BANNERS.map((banner) => (
            <PromoBannerItem key={banner.key} banner={banner} />
          ))}
          <Suspense fallback={null}>
            <LowStockBanner />
          </Suspense>
        </ul>
      </section>
      <Suspense fallback={null}>
        <CategorySection />
      </Suspense>
      <WhyBuyHere items={WHY_BUY_HERE} />
      <Suspense fallback={null}>
        <BestSellersSection />
      </Suspense>
    </div>
  );
}

async function FeaturedSection({ searchParams }: { searchParams: PageProps<"/">["searchParams"] }) {
  const raw = await searchParams;
  await connection();
  const result = await loadHomePage(raw);

  if (result.kind !== "ok") {
    return (
      <p role="alert" className="text-sm text-destructive">
        {CATALOG_UNAVAILABLE_MESSAGE}
      </p>
    );
  }
  const { tabs, active, products } = result.data;
  return (
    <>
      <FeaturedTabs tabs={tabs} />
      <FeaturedSlider category={active} products={products} />
    </>
  );
}

async function LowStockBanner() {
  await connection();
  const result = await loadLowStockProduct();
  if (result.kind !== "ok") {
    return (
      <li>
        <p role="alert" className="text-sm text-destructive">
          {CATALOG_UNAVAILABLE_MESSAGE}
        </p>
      </li>
    );
  }
  if (result.data === null) return null;
  return <LowStockBannerItem product={result.data} />;
}

async function CategorySection() {
  await connection();
  const result = await loadCategoryCounts();
  if (result.kind !== "ok") {
    return <HomeSectionUnavailable id="home-categories" title="Categories" />;
  }
  return <CategoryTiles categories={result.data} />;
}

async function BestSellersSection() {
  await connection();
  const result = await loadBestSellerNames(new Date());
  if (result.kind !== "ok") {
    return <HomeSectionUnavailable id="home-best" title="Best sellers" />;
  }
  return <BestSellers names={result.data} />;
}

function FeaturedSkeleton() {
  return (
    <ul aria-label="Loading featured products" className="flex gap-4 overflow-hidden">
      {[0, 1, 2].map((key) => (
        <li key={key} className="h-80 w-64 shrink-0 animate-pulse rounded-lg border bg-muted" />
      ))}
    </ul>
  );
}
