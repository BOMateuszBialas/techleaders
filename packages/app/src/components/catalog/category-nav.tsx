import Link from "next/link";
import type { CatalogCategory } from "@commerceos/core";
import { cn } from "cn";
import { productsHref } from "./catalog-copy";

type CategoryNavProps = {
  categories: CatalogCategory[];
  /**
   * The current listing: `null` for all products, a slug for one category. Omit it when the
   * requested category does not exist.
   */
  activeSlug?: string | null;
  /** The current search term; the links keep it, so a category narrows the search. */
  search?: string;
};

/** "All products" plus one link per category; the current one has `aria-current="page"`. */
export function CategoryNav({ categories, activeSlug, search }: CategoryNavProps) {
  const links = [
    {
      key: "all",
      href: productsHref(undefined, search),
      label: "All products",
      active: activeSlug === null,
    },
    ...categories.map((category) => ({
      key: category.slug,
      href: productsHref(category.slug, search),
      label: category.name,
      active: activeSlug === category.slug,
    })),
  ];
  return (
    <nav aria-label="Categories">
      <ul className="flex flex-wrap gap-2 text-sm">
        {links.map((link) => (
          <li key={link.key}>
            <Link
              href={link.href}
              aria-current={link.active ? "page" : undefined}
              className={cn(
                "inline-block rounded-full border px-3 py-1 hover:bg-muted focus-visible:bg-muted",
                link.active && "bg-primary text-primary-foreground hover:bg-primary/90",
              )}
            >
              {link.label}
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  );
}
