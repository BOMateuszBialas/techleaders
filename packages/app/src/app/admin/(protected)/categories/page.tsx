import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import {
  EMPTY_CATEGORIES_MESSAGE,
  categoryNotice,
  categoryPath,
  productCountLabel,
} from "@/components/admin/categories/category-copy";
import { buttonVariants } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { requireAdminPage } from "@/server/auth/require-admin";
import { AdminPageLoadError, loadAdminCategories } from "./load-categories";

export const metadata: Metadata = { title: "Categories" };

export default function CategoriesPage({ searchParams }: PageProps<"/admin/categories">) {
  return (
    <div className="flex max-w-4xl flex-col gap-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Categories</h1>
          <p className="text-sm text-muted-foreground">
            Categories are the store&apos;s navigation: the menu, the home page tabs and
            /products?category=….
          </p>
        </div>
        <Link href="/admin/categories/new" className={buttonVariants()}>
          New category
        </Link>
      </div>
      <Suspense fallback={<p className="text-sm text-muted-foreground">Loading categories…</p>}>
        <CategoryList searchParams={searchParams} />
      </Suspense>
    </div>
  );
}

async function CategoryList({
  searchParams,
}: Pick<PageProps<"/admin/categories">, "searchParams">) {
  await requireAdminPage();
  const notice = categoryNotice((await searchParams).notice);
  const result = await loadAdminCategories();
  if (result.kind !== "ok") throw new AdminPageLoadError();
  const categories = result.data;

  return (
    <div className="flex flex-col gap-4">
      {notice ? (
        <p role="status" className="text-sm font-medium text-emerald-700 dark:text-emerald-400">
          {notice}
        </p>
      ) : null}
      {categories.length === 0 ? (
        <p className="text-sm text-muted-foreground">{EMPTY_CATEGORIES_MESSAGE}</p>
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Slug</TableHead>
              <TableHead className="text-right">Products</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {categories.map((category) => (
              <TableRow key={category.id}>
                <TableCell>
                  <Link
                    href={categoryPath(category.id)}
                    className="font-medium underline-offset-4 hover:underline"
                  >
                    {category.name}
                  </Link>
                </TableCell>
                <TableCell className="text-muted-foreground">{category.slug}</TableCell>
                <TableCell className="text-right">
                  {productCountLabel(category.productCount)}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}
    </div>
  );
}
