import Image from "next/image";
import Link from "next/link";
import type { CategoryCount } from "@commerceos/core";
import { NO_PHOTO_LABEL, productsHref, resultCountText } from "@/components/catalog/catalog-copy";
import { photoSrc } from "@/components/catalog/product-photo";
import { FeaturedCarousel } from "./featured-carousel";

/**
 * The categories of the home page (storefront refresh, 2026-11-04): a heading, a line under it, and
 * a carousel of photo cards. Each card names its category and its published product count, with an
 * arrow to the listing. A category without published products is omitted, and with none left the
 * whole section is omitted. The photo is decorative (the card's text names the category), so its
 * alt text is empty; without a photo the card shows the neutral "No photo yet" label.
 */
export function CategoryTiles({ categories }: { categories: readonly CategoryCount[] }) {
  if (categories.length === 0) return null;
  return (
    <section aria-labelledby="home-categories" className="flex flex-col gap-6">
      <div className="flex flex-col gap-2">
        <h2 id="home-categories" className="text-2xl font-semibold tracking-tight">
          Shop by category
        </h2>
        <p className="text-muted-foreground">Browse the store by what you are looking for.</p>
      </div>
      <FeaturedCarousel label="Categories" count={categories.length}>
        {categories.map((category) => (
          <CategoryCard key={category.slug} category={category} />
        ))}
      </FeaturedCarousel>
    </section>
  );
}

function CategoryCard({ category }: { category: CategoryCount }) {
  const src = photoSrc(category.imageUrl);
  return (
    <li className="w-72 shrink-0 sm:w-80">
      <Link
        href={productsHref(category.slug)}
        className="group relative block aspect-4/5 overflow-hidden rounded-xl border bg-muted"
      >
        {src ? (
          <Image
            src={src}
            alt=""
            fill
            unoptimized
            sizes="(min-width: 640px) 320px, 288px"
            className="object-cover transition duration-500 group-hover:scale-105"
          />
        ) : (
          <span className="absolute inset-0 flex items-center justify-center text-sm text-muted-foreground">
            {NO_PHOTO_LABEL}
          </span>
        )}
        <span
          aria-hidden="true"
          className="absolute inset-0 bg-gradient-to-t from-foreground/70 via-foreground/10 to-transparent"
        />
        <span
          className={
            src
              ? "absolute inset-x-0 bottom-0 flex items-end justify-between gap-3 p-5 text-background"
              : "absolute inset-x-0 bottom-0 flex items-end justify-between gap-3 p-5 text-foreground"
          }
        >
          <span className="flex flex-col gap-1">
            <span className="text-xl font-semibold">{category.name}</span>
            <span className="text-sm opacity-80">{resultCountText(category.productCount)}</span>
          </span>
          <span className="grid size-10 shrink-0 place-items-center rounded-full bg-background text-foreground transition group-hover:translate-x-1">
            <ArrowRightIcon />
          </span>
        </span>
      </Link>
    </li>
  );
}

function ArrowRightIcon() {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="size-5"
    >
      <path d="M5 12h14" />
      <path d="m13 6 6 6-6 6" />
    </svg>
  );
}
