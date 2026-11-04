import Link from "next/link";
import { formatMoney, type CatalogProductSummary } from "@commerceos/core";
import { AddToCart } from "@/components/cart/add-to-cart";
import { addToCart } from "@/server/cart/cart.action";
import { AvailabilityBadge } from "./availability-badge";
import { ProductImage } from "./product-image";

/**
 * One product in a listing (storefront refresh, 2026-11-04): a translucent panel with a photo, a
 * monospaced category tag, the name, the price and the full-width purchase button in the action
 * red. The whole card is one link to the product page: the name's link covers the card (a
 * stretched link), and the button sits above it so it still adds to the cart.
 */
export function ProductCard({ product }: { product: CatalogProductSummary }) {
  return (
    <article className="group relative flex h-full flex-col overflow-hidden rounded-xl border border-foreground/10 bg-card/70 backdrop-blur-sm transition duration-300 hover:-translate-y-1 hover:border-foreground/30 hover:shadow-lg">
      <div className="relative overflow-hidden bg-muted">
        <ProductImage
          imageUrl={product.imageUrl}
          name={product.name}
          size={480}
          className="aspect-4/5 rounded-none border-0 transition duration-500 group-hover:scale-105"
        />
        {product.category ? (
          <p className="absolute top-3 left-3 rounded-md border border-foreground/10 bg-background/70 px-2 py-1 font-mono text-xs tracking-widest uppercase backdrop-blur-md">
            {product.category.name}
          </p>
        ) : null}
      </div>
      <div className="flex flex-1 flex-col gap-4 p-5">
        <h3 className="text-lg leading-snug font-semibold">
          <Link
            href={`/products/${product.slug}`}
            className="after:absolute after:inset-0 hover:underline focus-visible:underline focus-visible:outline-none"
          >
            {product.name}
          </Link>
        </h3>
        <div className="mt-auto flex items-end justify-between gap-3">
          <p className="font-mono text-2xl font-bold tracking-tight tabular-nums">
            {formatMoney(product.price)}
          </p>
          <AvailabilityBadge availability={product.availability} />
        </div>
        <div className="relative z-10">
          <AddToCart
            action={addToCart}
            productId={product.id}
            available={product.availability === "in_stock"}
            withQuantity={false}
            variant="action"
            size="default"
            fill
          />
        </div>
      </div>
    </article>
  );
}
