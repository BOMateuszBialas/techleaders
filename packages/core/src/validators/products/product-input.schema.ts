import { z } from "zod";
import { parsePriceInput } from "../../domain/money";
import { normalizeSku, PRODUCT_STATUSES, slugify } from "../../domain/products/product";
import type { ProductCreate, ProductWrite } from "../../ports/catalog.port";
import { PRODUCT_SLUG_MAX_LENGTH, slugProblem } from "../catalog/slug.schema";
import { isUuid } from "../common/uuid.schema";
import { stockQuantitySchema } from "../inventory/stock-quantity.schema";

/** Column lengths of `products`; the description is a text column with a form limit. */
export const PRODUCT_NAME_MAX_LENGTH = 200;
export const PRODUCT_DESCRIPTION_MAX_LENGTH = 5000;
export const PRODUCT_SKU_MAX_LENGTH = 64;
export const PRODUCT_IMAGE_URL_MAX_LENGTH = 2048;

export const PRICE_EMPTY_MESSAGE = "Enter a price.";
export const PRICE_FORMAT_MESSAGE =
  "Enter a price such as 249.90 or 249,90: digits and at most two decimals.";
export const CATEGORY_CHOICE_MESSAGE = "Choose an existing category.";
export const IMAGE_URL_MESSAGE = "Enter an address starting with https://, or leave it blank.";
export const STATUS_MESSAGE = "Choose draft or published.";

/** Seeded demo images are local files under `public/demo/` (storefront spec G6, G21). */
const LOCAL_DEMO_IMAGE_PATTERN = /^\/demo\/[a-z0-9/-]+\.(?:svg|png|jpe?g|webp)$/;

/**
 * An image address the admin may store (spec A12, G6): an `https:` URL, or one of the seeded
 * local demo paths, so a seeded product can be saved without losing its picture.
 * `javascript:`, `data:` and `http:` URLs are refused.
 */
export function isAllowedImageUrl(value: string): boolean {
  if (LOCAL_DEMO_IMAGE_PATTERN.test(value)) return true;
  return URL.canParse(value) && new URL(value).protocol === "https:";
}

/** A checkbox posts "on" when ticked and nothing when not; a boolean is accepted too. */
const checkboxSchema = z
  .union([z.boolean(), z.literal("on"), z.literal("")])
  .default(false)
  .transform((value) => value === true || value === "on");

const productFieldsSchema = z.object({
  name: z
    .string()
    .trim()
    .min(1, "Enter a name.")
    .max(PRODUCT_NAME_MAX_LENGTH, `Use at most ${PRODUCT_NAME_MAX_LENGTH} characters.`),
  slug: z.string().trim().toLowerCase().default(""),
  description: z
    .string()
    .trim()
    .max(
      PRODUCT_DESCRIPTION_MAX_LENGTH,
      `Use at most ${PRODUCT_DESCRIPTION_MAX_LENGTH} characters.`,
    )
    .default(""),
  price: z
    .string()
    .default("")
    .transform((text, context) => {
      const minor = parsePriceInput(text);
      if (minor === null) {
        context.addIssue({
          code: "custom",
          message: text.trim() === "" ? PRICE_EMPTY_MESSAGE : PRICE_FORMAT_MESSAGE,
        });
        return z.NEVER;
      }
      return minor;
    }),
  sku: z
    .string()
    .trim()
    .default("")
    .transform(normalizeSku)
    // Checked after upper-casing, which can lengthen a string ("ß" → "SS"): the column is 64.
    .refine(
      (sku) => sku === null || sku.length <= PRODUCT_SKU_MAX_LENGTH,
      `Use at most ${PRODUCT_SKU_MAX_LENGTH} characters.`,
    ),
  categoryId: z
    .string()
    .trim()
    .default("")
    .refine((value) => value === "" || isUuid(value), CATEGORY_CHOICE_MESSAGE)
    .transform((value) => value || null),
  imageUrl: z
    .string()
    .trim()
    .max(PRODUCT_IMAGE_URL_MAX_LENGTH, `Use at most ${PRODUCT_IMAGE_URL_MAX_LENGTH} characters.`)
    .default("")
    .refine((value) => value === "" || isAllowedImageUrl(value), IMAGE_URL_MESSAGE)
    .transform((value) => value || null),
  featured: checkboxSchema,
});

type ProductFields = z.output<typeof productFieldsSchema>;

/** The slug to store: the typed one, or one derived from the name when it was left blank. */
function resolveSlug(fields: ProductFields): { slug: string } | { problem: string } {
  const slug = fields.slug === "" ? slugify(fields.name) : fields.slug;
  const problem = slugProblem(slug, PRODUCT_SLUG_MAX_LENGTH);
  return problem ? { problem } : { slug };
}

function toProductWrite(fields: ProductFields, slug: string): ProductWrite {
  return {
    name: fields.name,
    slug,
    description: fields.description,
    priceMinor: fields.price,
    sku: fields.sku,
    categoryId: fields.categoryId,
    imageUrl: fields.imageUrl,
    featured: fields.featured,
  };
}

/**
 * A product edit as the owner submits it (spec A8–A12, G4–G6, G9). The price is the typed
 * text, parsed into minor units; a blank slug is derived from the name; a blank SKU,
 * category or image becomes `null`. Status and stock are not part of an edit: status has its
 * own action, and stock changes only through the recorded adjustment (spec A14).
 */
export const productInputSchema = productFieldsSchema.transform((fields, context) => {
  const resolved = resolveSlug(fields);
  if ("problem" in resolved) {
    context.addIssue({ code: "custom", path: ["slug"], message: resolved.problem });
    return z.NEVER;
  }
  return toProductWrite(fields, resolved.slug);
});

/** A new product: the edit fields plus its initial status and stock (spec A14). */
export const createProductInputSchema = productFieldsSchema
  .extend({
    // A form posts "" for a missing field (`readFormValues`); that means the default, draft.
    status: z.preprocess(
      (value) => (value === "" ? undefined : value),
      z.enum(PRODUCT_STATUSES, STATUS_MESSAGE).default("draft"),
    ),
    stockQuantity: stockQuantitySchema,
  })
  .transform((fields, context): ProductCreate => {
    const resolved = resolveSlug(fields);
    if ("problem" in resolved) {
      context.addIssue({ code: "custom", path: ["slug"], message: resolved.problem });
      return z.NEVER;
    }
    return {
      ...toProductWrite(fields, resolved.slug),
      status: fields.status,
      stockQuantity: fields.stockQuantity,
    };
  });

/** The target of a publish or unpublish click. */
export const productStatusSchema = z.enum(PRODUCT_STATUSES, STATUS_MESSAGE);

export type ProductInput = z.output<typeof productInputSchema>;
export type CreateProductInput = z.output<typeof createProductInputSchema>;
