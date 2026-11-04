import Link from "next/link";
import { ProductImage } from "@/components/catalog/product-image";

/**
 * A best seller of the last 30 days (storefront v2 Q11, OA-7). `product` is the published product
 * when it still exists: its photo and link are shown. A deleted or unpublished product keeps its
 * name and no link.
 */
export type BestSeller = {
  name: string;
  /** The ranking metric. Not shown: the section lists names and ranks only (Q11). */
  units: number;
  product: { slug: string; imageUrl: string | null } | null;
};

/**
 * Best sellers (storefront refresh, 2026-11-04): a ranked grid of cards, each with its rank, its
 * photo, its name and the units sold. With no paid orders in the window the section is omitted.
 */
export function BestSellers({ items }: { items: readonly BestSeller[] }) {
  if (items.length === 0) return null;
  return (
    <section aria-labelledby="home-best" className="flex flex-col gap-6">
      <div className="flex flex-col gap-2">
        <p className="font-mono text-xs tracking-widest text-muted-foreground uppercase">
          Last 30 days
        </p>
        <h2 id="home-best" className="storefront-section-title-lg">
          Best sellers
        </h2>
      </div>
      <ol className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {items.map((item, index) => (
          <li
            key={`${index}-${item.name}`}
            className="group relative flex items-center gap-4 rounded-xl border border-foreground/10 bg-card/70 p-3 backdrop-blur-sm transition duration-300 hover:border-foreground/30 hover:shadow-md"
          >
            <span className="w-10 shrink-0 font-mono text-3xl font-bold text-muted-foreground/50 tabular-nums">
              {String(index + 1).padStart(2, "0")}
            </span>
            <div className="w-20 shrink-0 overflow-hidden rounded-md">
              <ProductImage
                imageUrl={item.product?.imageUrl ?? null}
                name={item.name}
                size={160}
                className="rounded-md transition duration-500 group-hover:scale-105"
              />
            </div>
            <div className="flex min-w-0 flex-col gap-1">
              <p className="leading-snug font-semibold">
                {item.product ? (
                  <Link
                    href={`/products/${item.product.slug}`}
                    className="after:absolute after:inset-0 hover:underline focus-visible:underline focus-visible:outline-none"
                  >
                    {item.name}
                  </Link>
                ) : (
                  item.name
                )}
              </p>
            </div>
          </li>
        ))}
      </ol>
    </section>
  );
}
