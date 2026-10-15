import { categorySlugSchema } from "./slug.schema";

/** Raw `searchParams` as Next.js passes them to a page. */
export type RawSearchParams = Record<string, string | string[] | undefined>;

/**
 * The parsed catalog listing query. `categoryInvalid` marks a malformed `?category=`,
 * which the listing shows as "This category does not exist" (spec Q11).
 */
export type CatalogQuery = { category?: string; categoryInvalid: boolean };

/** A repeated parameter (`?category=a&category=b`) uses its first value (spec Q14). */
function firstValue(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

/**
 * Turns untrusted `searchParams` into a `CatalogQuery`. Never throws: invalid input
 * becomes a flag the page renders as a state, not an error.
 */
export function parseCatalogQuery(raw: RawSearchParams): CatalogQuery {
  const category = firstValue(raw.category);
  if (category === undefined || category.trim() === "") return { categoryInvalid: false };

  const parsed = categorySlugSchema.safeParse(category);
  return parsed.success
    ? { category: parsed.data, categoryInvalid: false }
    : { categoryInvalid: true };
}
