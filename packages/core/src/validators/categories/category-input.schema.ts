import { z } from "zod";
import { isValidSlug, slugify } from "../../domain/products/product";
import { CATEGORY_SLUG_MAX_LENGTH } from "../catalog/slug.schema";

/** Column lengths of `categories.name`; the description is a text column with a form limit. */
export const CATEGORY_NAME_MAX_LENGTH = 120;
export const CATEGORY_DESCRIPTION_MAX_LENGTH = 1000;

export const SLUG_FORMAT_MESSAGE =
  "Use lowercase letters, numbers and single hyphens, for example gaming-mice.";
export const SLUG_EMPTY_MESSAGE = "Enter a slug using letters and numbers.";

/**
 * A category as the owner submits it (spec A10, G5). The slug is optional: blank means
 * "derive it from the name". A typed slug is trimmed and lowercased, then checked against
 * the slug pattern. A blank description is stored as `null`.
 */
export const categoryInputSchema = z
  .object({
    name: z
      .string()
      .trim()
      .min(1, "Enter a name.")
      .max(CATEGORY_NAME_MAX_LENGTH, `Use at most ${CATEGORY_NAME_MAX_LENGTH} characters.`),
    slug: z.string().trim().toLowerCase().default(""),
    description: z
      .string()
      .trim()
      .max(
        CATEGORY_DESCRIPTION_MAX_LENGTH,
        `Use at most ${CATEGORY_DESCRIPTION_MAX_LENGTH} characters.`,
      )
      .default(""),
  })
  .transform((input, context) => {
    const slug = input.slug === "" ? slugify(input.name) : input.slug;
    const problem =
      slug === ""
        ? SLUG_EMPTY_MESSAGE
        : !isValidSlug(slug)
          ? SLUG_FORMAT_MESSAGE
          : slug.length > CATEGORY_SLUG_MAX_LENGTH
            ? `Use at most ${CATEGORY_SLUG_MAX_LENGTH} characters.`
            : null;
    if (problem) {
      context.addIssue({ code: "custom", path: ["slug"], message: problem });
      return z.NEVER;
    }
    return { name: input.name, slug, description: input.description || null };
  });

export type CategoryInput = z.output<typeof categoryInputSchema>;
