import Link from "next/link";
import type { CatalogCategory } from "@commerceos/core";
import { productsHref } from "@/components/catalog/catalog-copy";

/**
 * "Shop all" and one link per category, shared by the inline menu and the phone menu. `onNavigate`
 * runs when a link is followed (the phone menu closes then).
 */
export function MenuLinks({
  categories,
  onNavigate,
}: {
  categories: CatalogCategory[];
  onNavigate?: () => void;
}) {
  return (
    <>
      <li>
        <Link
          href={productsHref()}
          onClick={onNavigate}
          className="hover:text-foreground focus-visible:underline"
        >
          Shop all
        </Link>
      </li>
      {categories.map((category) => (
        <li key={category.slug}>
          <Link
            href={productsHref(category.slug)}
            onClick={onNavigate}
            className="hover:text-foreground focus-visible:underline"
          >
            {category.name}
          </Link>
        </li>
      ))}
    </>
  );
}
