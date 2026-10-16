import { z } from "zod";
import { isValidSlug, SLUG_PATTERN } from "../../domain/products/product";

/** Column lengths of `products.slug` and `categories.slug`. */
export const PRODUCT_SLUG_MAX_LENGTH = 220;
export const CATEGORY_SLUG_MAX_LENGTH = 140;

/** A product slug as it appears in `/products/<slug>`. No normalisation: a mismatch is not found. */
export const productSlugSchema = z.string().max(PRODUCT_SLUG_MAX_LENGTH).regex(SLUG_PATTERN);

/** A category slug from untrusted input: trimmed and lowercased before the pattern check. */
export const categorySlugSchema = z
  .string()
  .trim()
  .toLowerCase()
  .max(CATEGORY_SLUG_MAX_LENGTH)
  .regex(SLUG_PATTERN);

export const SLUG_FORMAT_MESSAGE =
  "Use lowercase letters, numbers and single hyphens, for example gaming-mice.";
export const SLUG_EMPTY_MESSAGE = "Enter a slug using letters and numbers.";

/**
 * Why a slug from an admin form cannot be saved, or null when it can (spec A10, G5): empty
 * (a name made only of symbols derives ""), not matching the slug pattern, or too long.
 */
export function slugProblem(slug: string, maxLength: number): string | null {
  if (slug === "") return SLUG_EMPTY_MESSAGE;
  if (!isValidSlug(slug)) return SLUG_FORMAT_MESSAGE;
  return slug.length > maxLength ? `Use at most ${maxLength} characters.` : null;
}
