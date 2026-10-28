import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { DescriptionDraftPanel } from "@/components/admin/products/description-draft-panel";
import { ProductForm } from "@/components/admin/products/product-form";
import { PRODUCTS_PATH } from "@/components/admin/products/product-copy";
import { requireAdminPage } from "@/server/auth/require-admin";
import { createProduct } from "@/server/catalog/product.action";
import { AdminPageLoadError } from "../../categories/load-categories";
import { loadNewProductForm } from "../load-products";
import { Skeleton, SkeletonGroup } from "@/components/ui/skeleton";

export const metadata: Metadata = { title: "New product" };

export default function NewProductPage() {
  return (
    <div className="flex max-w-4xl flex-col gap-6">
      <Link href={PRODUCTS_PATH} className="w-fit text-sm underline underline-offset-4">
        All products
      </Link>
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">New product</h1>
        <p className="text-sm text-muted-foreground">
          A draft stays hidden from shoppers; a published product appears in the store right away.
        </p>
      </div>
      <Suspense
        fallback={
          <SkeletonGroup label="Loading form…">
            <Skeleton className="h-24 rounded-card" />
          </SkeletonGroup>
        }
      >
        <NewProductForm />
      </Suspense>
    </div>
  );
}

async function NewProductForm() {
  await requireAdminPage();
  const result = await loadNewProductForm();
  if (result.kind !== "ok") throw new AdminPageLoadError();
  const { categories, aiDraftAvailable } = result.data;
  return (
    <ProductForm
      action={createProduct}
      categories={categories}
      descriptionDraft={<DescriptionDraftPanel available={aiDraftAvailable} />}
    />
  );
}
