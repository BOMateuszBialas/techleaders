import Image from "next/image";
import Link from "next/link";
import type { CategoryCount } from "@commerceos/core";
import { NO_PHOTO_LABEL, productsHref, resultCountText } from "@/components/catalog/catalog-copy";
import { photoSrc } from "@/components/catalog/product-photo";

/**
 * The categories of the home page (storefront refresh, 2026-11-04): a heading, a line under it, and
 * the categories side by side across the full width of the screen, with no slider. Each tile names
 * its category and its published product count, with an arrow to the listing. A category without
 * published products is omitted, and with none left the whole section is omitted. The photo is
 * decorative (the tile's text names the category), so its alt text is empty; without a photo the
 * tile shows the neutral "No photo yet" label.
 */
export function CategoryTiles({ categories }: { categories: readonly CategoryCount[] }) {
  if (categories.length === 0) return null;
  return (
    <section aria-labelledby="home-categories" className="flex flex-col gap-6">
      <div className="flex flex-col items-center gap-2 text-center">
        <h2 id="home-categories" className="storefront-section-title-lg">
          Shop by category
        </h2>
        <p className="text-muted-foreground">Browse the store by what you are looking for.</p>
      </div>
      <div className="relative left-1/2 w-screen -translate-x-1/2">
        <ul className="featured-track flex snap-x overflow-x-auto scroll-px-4 px-4 md:grid md:scroll-px-0 md:grid-cols-4 md:px-0 xl:grid-cols-5">
          {categories.map((category) => (
            <CategoryTile key={category.slug} category={category} />
          ))}
        </ul>
      </div>
    </section>
  );
}

function CategoryTile({ category }: { category: CategoryCount }) {
  const src = photoSrc(category.imageUrl);
  return (
    <li className="w-full shrink-0 snap-start sm:w-1/2 md:w-auto">
      <Link
        href={productsHref(category.slug)}
        className="group relative block aspect-4/5 overflow-hidden bg-muted"
      >
        {src ? (
          <Image
            src={src}
            alt=""
            fill
            unoptimized
            sizes="(min-width: 1280px) 288px, (min-width: 768px) 25vw, 50vw"
            className="object-cover transition duration-500 group-hover:scale-105"
          />
        ) : (
          <span className="absolute inset-0 flex items-center justify-center text-sm text-muted-foreground">
            {NO_PHOTO_LABEL}
          </span>
        )}
        <span aria-hidden="true" className="absolute inset-0 image-scrim" />
        <span
          className={
            src
              ? "absolute inset-x-0 bottom-0 flex items-end justify-between gap-3 p-5 on-image"
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
