import Image from "next/image";
import Link from "next/link";
import type { CategoryCount } from "@commerceos/core";
import { NO_PHOTO_LABEL, productsHref, resultCountText } from "@/components/catalog/catalog-copy";
import { photoSrc } from "@/components/catalog/product-photo";

/**
 * Category tiles with their published product counts (storefront v2 Q12). A category without
 * published products is omitted, and with none left the whole section is omitted. The photo slot
 * shows the category's `image_url` (OA-11a) under the storefront photo rule, and the neutral
 * "No photo yet" label when there is none. The photo is decorative: the link text names the
 * category, so its alt text is empty.
 */
export function CategoryTiles({ categories }: { categories: readonly CategoryCount[] }) {
  if (categories.length === 0) return null;
  return (
    <section aria-labelledby="home-categories" className="flex flex-col gap-4">
      <h2 id="home-categories" className="text-xl font-semibold tracking-tight">
        Categories
      </h2>
      <ul className="grid grid-cols-2 gap-4 md:grid-cols-4">
        {categories.map((category) => {
          const src = photoSrc(category.imageUrl);
          return (
            <li key={category.slug}>
              <Link
                href={productsHref(category.slug)}
                className="flex h-full flex-col gap-2 rounded-lg border p-3 hover:bg-muted focus-visible:bg-muted"
              >
                <span className="relative flex aspect-video w-full items-center justify-center overflow-hidden rounded-md border bg-muted text-sm text-muted-foreground">
                  {src ? (
                    <Image
                      src={src}
                      alt=""
                      fill
                      unoptimized
                      sizes="(min-width: 768px) 25vw, 50vw"
                      className="object-cover"
                    />
                  ) : (
                    NO_PHOTO_LABEL
                  )}
                </span>
                <span className="font-medium">{category.name}</span>
                <span className="text-sm text-muted-foreground">
                  {resultCountText(category.productCount)}
                </span>
              </Link>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
