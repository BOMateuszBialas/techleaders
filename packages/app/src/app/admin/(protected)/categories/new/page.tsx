import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { CATEGORIES_PATH } from "@/components/admin/categories/category-copy";
import { CategoryForm } from "@/components/admin/categories/category-form";
import { requireAdminPage } from "@/server/auth/require-admin";
import { createCategory } from "@/server/catalog/category.action";

export const metadata: Metadata = { title: "New category" };

export default function NewCategoryPage() {
  return (
    <div className="flex max-w-4xl flex-col gap-6">
      <Link href={CATEGORIES_PATH} className="w-fit text-sm underline underline-offset-4">
        All categories
      </Link>
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">New category</h1>
        <p className="text-sm text-muted-foreground">
          A new category appears in the store&apos;s menu and home page tabs right away.
        </p>
      </div>
      <Suspense fallback={<p className="text-sm text-muted-foreground">Checking session…</p>}>
        <NewCategoryForm />
      </Suspense>
    </div>
  );
}

async function NewCategoryForm() {
  await requireAdminPage();
  return <CategoryForm action={createCategory} />;
}
