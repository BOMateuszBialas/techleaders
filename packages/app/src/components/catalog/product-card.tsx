import Link from "next/link";
import { formatMoney, type CatalogProductSummary } from "@commerceos/core";
import { AddToCart } from "@/components/cart/add-to-cart";
import { addToCart } from "@/server/cart/cart.action";
import { AvailabilityBadge } from "./availability-badge";
import { ProductImage } from "./product-image";

/**
 * One product in a listing: image, name (links to its page), price, category, availability
 * and a quick "Add to cart" of one (cart spec G8), disabled when out of stock.
 */
export function ProductCard({ product }: { product: CatalogProductSummary }) {
  return (
    <article className="flex h-full flex-col gap-3 rounded-lg border p-3">
      <ProductImage imageUrl={product.imageUrl} name={product.name} size={320} />
      <h3 className="font-medium">
        <Link
          href={`/products/${product.slug}`}
          className="hover:underline focus-visible:underline"
        >
          {product.name}
        </Link>
      </h3>
      <p className="font-semibold">{formatMoney(product.price)}</p>
      {product.category ? (
        <p className="text-sm text-muted-foreground">{product.category.name}</p>
      ) : null}
      <div className="mt-auto flex flex-wrap items-start justify-between gap-2">
        <AvailabilityBadge availability={product.availability} />
        <AddToCart
          action={addToCart}
          productId={product.id}
          available={product.availability === "in_stock"}
          withQuantity={false}
          variant="outline"
          size="sm"
        />
      </div>
    </article>
  );
}
