import { describeStoreAvailability } from "@commerceos/core";
import type { Metadata } from "next";
import { headers } from "next/headers";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { FeaturedBadge, StoreAvailabilityBadge } from "@/components/admin/products/product-badges";
import {
  featuredNote,
  PRODUCTS_PATH,
  productNotice,
  storefrontProductHref,
} from "@/components/admin/products/product-copy";
import { DescriptionDraftPanel } from "@/components/admin/products/description-draft-panel";
import { ProductForm } from "@/components/admin/products/product-form";
import { PublishControl } from "@/components/admin/products/publish-control";
import { ownerLocale, toStockHistoryRows } from "@/components/admin/products/stock-copy";
import { StockPanel } from "@/components/admin/products/stock-panel";
import { RedirectNotice } from "@/components/admin/redirect-notice";
import { requireAdminPage } from "@/server/auth/require-admin";
import { setProductStatus, updateProduct } from "@/server/catalog/product.action";
import { adjustStock } from "@/server/catalog/stock.action";
import { AdminPageLoadError } from "../../categories/load-categories";
import { loadAdminProduct } from "../load-products";
import { Skeleton, SkeletonGroup } from "@/components/ui/skeleton";

export const metadata: Metadata = { title: "Product" };

type ProductPageProps = PageProps<"/admin/products/[id]">;

export default function ProductPage({ params, searchParams }: ProductPageProps) {
  return (
    <div className="flex max-w-4xl flex-col gap-6">
      <Link href={PRODUCTS_PATH} className="w-fit text-sm underline underline-offset-4">
        All products
      </Link>
      <Suspense
        fallback={
          <SkeletonGroup label="Loading product…">
            <Skeleton className="h-24 rounded-card" />
          </SkeletonGroup>
        }
      >
        <ProductDetails params={params} searchParams={searchParams} />
      </Suspense>
    </div>
  );
}

async function ProductDetails({ params, searchParams }: ProductPageProps) {
  await requireAdminPage();
  const { id } = await params;
  const notice = productNotice((await searchParams).notice);
  const result = await loadAdminProduct(id);

  // Control flow runs after the loader has mapped every error (never inside a try block).
  if (result.kind === "not-found") notFound();
  if (result.kind === "error") throw new AdminPageLoadError();
  const { product, categories, stockHistory, aiDraftAvailable } = result.data;
  const locale = ownerLocale((await headers()).get("accept-language"));
  const storeHref = storefrontProductHref(product.slug);
  const featured = featuredNote(product);

  return (
    <div className="flex flex-col gap-8">
      <div className="flex flex-col gap-2">
        <h1 className="text-2xl font-semibold tracking-tight">{product.name}</h1>
        <div className="flex flex-wrap items-center gap-2" role="group" aria-label="In the store">
          <StoreAvailabilityBadge availability={product.availability} />
          {product.featured ? <FeaturedBadge /> : null}
          <span className="text-sm">{describeStoreAvailability(product.availability)}</span>
        </div>
        {product.status === "published" ? (
          <p className="text-sm text-muted-foreground">
            In the store:{" "}
            <Link href={storeHref} className="underline underline-offset-4">
              {storeHref}
            </Link>
          </p>
        ) : (
          <p className="text-sm text-muted-foreground">Store URL once published: {storeHref}</p>
        )}
        {featured ? <p className="text-sm text-muted-foreground">{featured}</p> : null}
        {notice ? <RedirectNotice message={notice} /> : null}
      </div>
      <PublishControl
        action={setProductStatus}
        product={{
          id: product.id,
          slug: product.slug,
          status: product.status,
          stockQuantity: product.stockQuantity,
        }}
      />
      <StockPanel
        action={adjustStock}
        product={{
          id: product.id,
          status: product.status,
          stockQuantity: product.stockQuantity,
        }}
        history={toStockHistoryRows(stockHistory, locale)}
      />
      <section aria-labelledby="details-heading" className="flex flex-col gap-3">
        <h2 id="details-heading" className="text-lg font-semibold">
          Details
        </h2>
        {/* Remounted when the status changes, so a save message written for the old status
            (e.g. "will not show until it is published") never outlives a publish click. */}
        <ProductForm
          key={product.status}
          action={updateProduct}
          categories={categories}
          descriptionDraft={<DescriptionDraftPanel available={aiDraftAvailable} />}
          product={{
            id: product.id,
            name: product.name,
            slug: product.slug,
            description: product.description,
            priceMinor: product.priceMinor,
            currency: product.currency,
            sku: product.sku,
            imageUrl: product.imageUrl,
            status: product.status,
            featured: product.featured,
            categoryId: product.category?.id ?? null,
          }}
        />
      </section>
    </div>
  );
}
