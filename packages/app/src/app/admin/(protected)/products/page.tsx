import { formatMoney, money } from "@commerceos/core";
import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { FeaturedBadge, StoreAvailabilityBadge } from "@/components/admin/products/product-badges";
import {
  EMPTY_PRODUCTS_MESSAGE,
  NEW_PRODUCT_PATH,
  productPath,
} from "@/components/admin/products/product-copy";
import { PRODUCT_IMPORT_PATH } from "@/components/admin/products/product-import-copy";
import { buttonVariants } from "@/components/ui/button";
import { Empty, EmptyContent, EmptyDescription, EmptyHeader } from "@/components/ui/empty";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { requireAdminPage } from "@/server/auth/require-admin";
import { AdminPageLoadError } from "../categories/load-categories";
import { loadAdminProducts } from "./load-products";
import { Skeleton, SkeletonGroup } from "@/components/ui/skeleton";

export const metadata: Metadata = { title: "Products" };

export default function ProductsPage() {
  return (
    <div className="flex max-w-5xl flex-col gap-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Products</h1>
          <p className="text-sm text-muted-foreground">
            Every product in any status. &quot;Hidden&quot; products are drafts shoppers cannot see.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link href={PRODUCT_IMPORT_PATH} className={buttonVariants({ variant: "outline" })}>
            Import CSV
          </Link>
          <Link href={NEW_PRODUCT_PATH} className={buttonVariants()}>
            New product
          </Link>
        </div>
      </div>
      <Suspense
        fallback={
          <SkeletonGroup label="Loading products…">
            <Skeleton className="h-24 rounded-card" />
          </SkeletonGroup>
        }
      >
        <ProductList />
      </Suspense>
    </div>
  );
}

async function ProductList() {
  await requireAdminPage();
  const result = await loadAdminProducts();
  if (result.kind !== "ok") throw new AdminPageLoadError();
  const products = result.data;

  if (products.length === 0) {
    return (
      <Empty>
        <EmptyHeader>
          <EmptyDescription>{EMPTY_PRODUCTS_MESSAGE}</EmptyDescription>
        </EmptyHeader>
        <EmptyContent>
          <Link href={NEW_PRODUCT_PATH} className={buttonVariants()}>
            New product
          </Link>
        </EmptyContent>
      </Empty>
    );
  }
  return (
    <Table aria-label="Products">
      <TableHeader>
        <TableRow>
          <TableHead>Name</TableHead>
          <TableHead>SKU</TableHead>
          <TableHead className="text-right">Price</TableHead>
          <TableHead className="text-right">Stock</TableHead>
          <TableHead>In the store</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {products.map((product) => (
          <TableRow key={product.id}>
            <TableCell>
              <Link
                href={productPath(product.id)}
                className="font-medium underline-offset-4 hover:underline"
              >
                {product.name}
              </Link>
            </TableCell>
            <TableCell className="text-muted-foreground">{product.sku ?? "—"}</TableCell>
            <TableCell className="text-right">
              {formatMoney(money(product.priceMinor, product.currency))}
            </TableCell>
            <TableCell className="text-right">{product.stockQuantity}</TableCell>
            <TableCell>
              <div className="flex flex-wrap gap-1">
                <StoreAvailabilityBadge availability={product.availability} />
                {product.featured ? <FeaturedBadge /> : null}
              </div>
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
