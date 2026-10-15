import Image from "next/image";
import Link from "next/link";
import { connection } from "next/server";
import { Suspense } from "react";
import { CATALOG_UNAVAILABLE_MESSAGE } from "@/components/catalog/catalog-copy";
import { FeaturedSlider, FeaturedTabs } from "@/components/storefront/featured-products";
import { HERO_DESCRIPTION, HERO_HEADLINE } from "@/components/storefront/storefront-copy";
import { buttonVariants } from "@/components/ui/button";
import { loadHomePage } from "./load-home-page";

/**
 * Storefront home as a shop front (spec Phase 1b): a static hero (G12) and the featured
 * products slider with category tabs (`/?category=<slug>`, G10, G11, G16–G19).
 */
export default function HomePage({ searchParams }: PageProps<"/">) {
  return (
    <>
      <section aria-labelledby="hero-heading" className="grid items-center gap-8 md:grid-cols-2">
        <div className="flex flex-col gap-4">
          <h1 id="hero-heading" className="text-3xl font-semibold tracking-tight sm:text-4xl">
            {HERO_HEADLINE}
          </h1>
          <p className="max-w-prose text-muted-foreground">{HERO_DESCRIPTION}</p>
          <Link href="/products" className={buttonVariants({ className: "w-fit" })}>
            Shop all products
          </Link>
        </div>
        <Image
          src="/demo/hero.svg"
          alt=""
          width={640}
          height={400}
          unoptimized
          className="h-auto w-full rounded-xl border"
        />
      </section>
      <section aria-labelledby="featured-heading" className="flex flex-col gap-4">
        <h2 id="featured-heading" className="text-xl font-semibold tracking-tight">
          Featured products
        </h2>
        <Suspense fallback={<FeaturedSkeleton />}>
          <FeaturedSection searchParams={searchParams} />
        </Suspense>
      </section>
    </>
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

function FeaturedSkeleton() {
  return (
    <ul aria-label="Loading featured products" className="flex gap-4 overflow-hidden">
      {[0, 1, 2].map((key) => (
        <li key={key} className="h-80 w-64 shrink-0 animate-pulse rounded-lg border bg-muted" />
      ))}
    </ul>
  );
}
