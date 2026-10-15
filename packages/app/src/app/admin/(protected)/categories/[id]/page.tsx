import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import {
  CATEGORIES_PATH,
  categoryNotice,
  storefrontCategoryHref,
} from "@/components/admin/categories/category-copy";
import { CategoryForm } from "@/components/admin/categories/category-form";
import { DeleteCategoryForm } from "@/components/admin/categories/delete-category-form";
import { requireAdminPage } from "@/server/auth/require-admin";
import { deleteCategory, updateCategory } from "@/server/catalog/category.action";
import { AdminPageLoadError, loadAdminCategory } from "../load-categories";

export const metadata: Metadata = { title: "Category" };

type CategoryPageProps = PageProps<"/admin/categories/[id]">;

export default function CategoryPage({ params, searchParams }: CategoryPageProps) {
  return (
    <div className="flex max-w-4xl flex-col gap-6">
      <Link href={CATEGORIES_PATH} className="w-fit text-sm underline underline-offset-4">
        All categories
      </Link>
      <Suspense fallback={<p className="text-sm text-muted-foreground">Loading category…</p>}>
        <CategoryDetails params={params} searchParams={searchParams} />
      </Suspense>
    </div>
  );
}

async function CategoryDetails({ params, searchParams }: CategoryPageProps) {
  await requireAdminPage();
  const { id } = await params;
  const notice = categoryNotice((await searchParams).notice);
  const result = await loadAdminCategory(id);

  // Control flow runs after the loader has mapped every error (never inside a try block).
  if (result.kind === "not-found") notFound();
  if (result.kind === "error") throw new AdminPageLoadError();
  const category = result.data;
  const storeHref = storefrontCategoryHref(category.slug);

  return (
    <div className="flex flex-col gap-8">
      <div className="flex flex-col gap-1">
        <h1 className="text-2xl font-semibold tracking-tight">{category.name}</h1>
        <p className="text-sm text-muted-foreground">
          In the store:{" "}
          <Link href={storeHref} className="underline underline-offset-4">
            {storeHref}
          </Link>
        </p>
        {notice ? (
          <p role="status" className="text-sm font-medium text-emerald-700 dark:text-emerald-400">
            {notice}
          </p>
        ) : null}
      </div>
      <CategoryForm
        action={updateCategory}
        category={{
          id: category.id,
          name: category.name,
          slug: category.slug,
          description: category.description,
          productCount: category.productCount,
        }}
      />
      <DeleteCategoryForm
        action={deleteCategory}
        category={{
          id: category.id,
          productCount: category.productCount,
          products: category.products,
        }}
      />
    </div>
  );
}
