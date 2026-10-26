import { z } from "zod";
import { parsePriceInput } from "../../domain/money";
import { isUuid } from "../common/uuid.schema";
import {
  CATEGORY_CHOICE_MESSAGE,
  PRICE_FORMAT_MESSAGE,
  PRODUCT_DESCRIPTION_MAX_LENGTH,
  PRODUCT_NAME_MAX_LENGTH,
  PRODUCT_SKU_MAX_LENGTH,
} from "./product-input.schema";

/**
 * `POST /api/admin/products/description-drafts` (descriptions spec, API Contracts): the values
 * currently in the product form (A4), with the form's own limits. The price and the category may
 * be blank; a blank price means "not set" (`null`). The description field is sent as `notes`.
 * The SKU is sent as `sku` and marks demo content only (a `DEMO-` SKU, storefront v2 OA-3); it is
 * not shown to the model. Nothing here is stored: the values are used only to draft a description.
 */
export const descriptionDraftSchema = z.object({
  name: z
    .string()
    .trim()
    .min(1, "Enter a name.")
    .max(PRODUCT_NAME_MAX_LENGTH, `Use at most ${PRODUCT_NAME_MAX_LENGTH} characters.`),
  categoryId: z
    .string()
    .trim()
    .default("")
    .refine((value) => value === "" || isUuid(value), CATEGORY_CHOICE_MESSAGE)
    .transform((value) => value || null),
  price: z
    .string()
    .trim()
    .default("")
    .transform((text, context) => {
      if (text === "") return null;
      const minor = parsePriceInput(text);
      if (minor === null) {
        context.addIssue({ code: "custom", message: PRICE_FORMAT_MESSAGE });
        return z.NEVER;
      }
      return minor;
    }),
  notes: z
    .string()
    .trim()
    .max(
      PRODUCT_DESCRIPTION_MAX_LENGTH,
      `Use at most ${PRODUCT_DESCRIPTION_MAX_LENGTH} characters.`,
    )
    .default(""),
  sku: z
    .string()
    .trim()
    .max(PRODUCT_SKU_MAX_LENGTH, `Use at most ${PRODUCT_SKU_MAX_LENGTH} characters.`)
    .default(""),
});

export type DescriptionDraftInput = z.output<typeof descriptionDraftSchema>;
