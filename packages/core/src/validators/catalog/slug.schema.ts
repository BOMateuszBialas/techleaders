import { z } from "zod";

/** Lowercase words of letters and digits joined by single hyphens, e.g. `vortex-wireless-mouse`. */
export const SLUG_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

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
