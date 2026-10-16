import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { connection } from "next/server";
import { Suspense } from "react";
import { formatMoney } from "@commerceos/core";
import { AddToCart } from "@/components/cart/add-to-cart";
import { AvailabilityBadge } from "@/components/catalog/availability-badge";
import { CATALOG_UNAVAILABLE_MESSAGE, productsHref } from "@/components/catalog/catalog-copy";
import { ProductImage } from "@/components/catalog/product-image";
import { addToCart } from "@/server/cart/cart.action";
import { loadProductPage, productPageTitle } from "./load-product-page";

type ProductPageProps = PageProps<"/products/[slug]">;

/** Streams with the deferred page body; shares the cached loader with the page. */
export async function generateMetadata({ params }: ProductPageProps): Promise<Metadata> {
  const { slug } = await params;
  await connection();
  return { title: productPageTitle(await loadProductPage(slug)) };
}

export default function ProductPage({ params }: ProductPageProps) {
  return (
    <Suspense fallback={<DetailSkeleton />}>
      <ProductDetails params={params} />
    </Suspense>
  );
}

async function ProductDetails({ params }: { params: ProductPageProps["params"] }) {
  const { slug } = await params;
  await connection();
  const result = await loadProductPage(slug);

  // Control flow runs after the loader has mapped every error (never inside a try block).
  if (result.kind === "not-found") notFound();
  if (result.kind === "error") {
    return (
      <p role="alert" className="text-sm text-destructive">
        {CATALOG_UNAVAILABLE_MESSAGE}
      </p>
    );
  }

  const product = result.data;
  return (
    <article className="grid gap-8 md:grid-cols-2">
      <ProductImage imageUrl={product.imageUrl} name={product.name} size={480} />
      <div className="flex flex-col gap-4">
        <h1 className="text-3xl font-semibold tracking-tight">{product.name}</h1>
        <p className="text-2xl font-semibold">{formatMoney(product.price)}</p>
        <AvailabilityBadge availability={product.availability} />
        <AddToCart
          action={addToCart}
          productId={product.id}
          available={product.availability === "in_stock"}
          withQuantity
        />
        {product.category ? (
          <p className="text-sm text-muted-foreground">
            Category:{" "}
            <Link
              href={productsHref(product.category.slug)}
              className="underline underline-offset-4"
            >
              {product.category.name}
            </Link>
          </p>
        ) : null}
        {/* Plain text: React escapes it, and model or merchant content is never rendered as HTML. */}
        <p className="whitespace-pre-line">{product.description}</p>
        <Link href="/products" className="w-fit text-sm underline underline-offset-4">
          Back to all products
        </Link>
      </div>
    </article>
  );
}

function DetailSkeleton() {
  return (
    <div aria-label="Loading product" className="grid gap-8 md:grid-cols-2">
      <div className="aspect-square animate-pulse rounded-md border bg-muted" />
      <div className="flex flex-col gap-4">
        <div className="h-9 w-2/3 animate-pulse rounded bg-muted" />
        <div className="h-7 w-1/4 animate-pulse rounded bg-muted" />
      </div>
    </div>
  );
}
