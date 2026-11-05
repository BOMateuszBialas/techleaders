import Link from "next/link";
import type { CatalogCategory } from "@commerceos/core";
import { productsHref } from "@/components/catalog/catalog-copy";

/** "Shop all" and one link per category, shared by the inline menu and the phone menu. */
export function MenuLinks({ categories }: { categories: CatalogCategory[] }) {
  return (
    <>
      <li>
        <Link href={productsHref()} className="hover:text-foreground focus-visible:underline">
          Shop all
        </Link>
      </li>
      {categories.map((category) => (
        <li key={category.slug}>
          <Link
            href={productsHref(category.slug)}
            className="hover:text-foreground focus-visible:underline"
          >
            {category.name}
          </Link>
        </li>
      ))}
    </>
  );
}
