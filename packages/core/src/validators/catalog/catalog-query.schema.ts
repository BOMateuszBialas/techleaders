import { z } from "zod";
import { categorySlugSchema } from "./slug.schema";

/** Raw `searchParams` as Next.js passes them to a page. */
export type RawSearchParams = Record<string, string | string[] | undefined>;

/** The longest search term the storefront accepts, after trimming (spec Q14). */
export const CATALOG_SEARCH_MAX_LENGTH = 100;

/**
 * A storefront search term: trimmed, with runs of whitespace collapsed to one space. An empty
 * result means "no search" (`undefined`); a term longer than `CATALOG_SEARCH_MAX_LENGTH` fails.
 */
export const catalogSearchSchema = z
  .string()
  .transform((value) => value.trim().replace(/\s+/g, " "))
  .pipe(z.string().max(CATALOG_SEARCH_MAX_LENGTH))
  .transform((value) => (value === "" ? undefined : value));

/**
 * The parsed catalog listing query. `categoryInvalid` marks a malformed `?category=`,
 * which the listing shows as "This category does not exist" (spec Q11). `qError` marks a
 * search term that is too long; `q` is then undefined and no query runs (spec Q14).
 */
export type CatalogQuery = {
  category?: string;
  categoryInvalid: boolean;
  q?: string;
  qError?: "too_long";
};

/** A repeated parameter (`?category=a&category=b`) uses its first value (spec Q14). */
function firstValue(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

function parseCategory(
  raw: string | undefined,
): Pick<CatalogQuery, "category" | "categoryInvalid"> {
  if (raw === undefined || raw.trim() === "") return { categoryInvalid: false };
  const parsed = categorySlugSchema.safeParse(raw);
  return parsed.success
    ? { category: parsed.data, categoryInvalid: false }
    : { categoryInvalid: true };
}

function parseSearch(raw: string | undefined): Pick<CatalogQuery, "q" | "qError"> {
  if (raw === undefined) return {};
  const parsed = catalogSearchSchema.safeParse(raw);
  if (!parsed.success) return { qError: "too_long" };
  return parsed.data === undefined ? {} : { q: parsed.data };
}

/**
 * Turns untrusted `searchParams` into a `CatalogQuery`. Never throws: invalid input
 * becomes a flag the page renders as a state, not an error.
 */
export function parseCatalogQuery(raw: RawSearchParams): CatalogQuery {
  return { ...parseCategory(firstValue(raw.category)), ...parseSearch(firstValue(raw.q)) };
}
