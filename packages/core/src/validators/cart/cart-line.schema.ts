import { z } from "zod";
import { CART_LIMITS } from "../../domain/cart/cart";
import { ValidationError } from "../../errors/app-error";
import { parseInput } from "../parse-input";

export const CART_QUANTITY_MESSAGE = `Enter a whole number from 1 to ${CART_LIMITS.maxQuantity}.`;

/** The message for an id that is not a product id (a forged form, not a typo). */
export const CART_PRODUCT_MESSAGE = "This product is not available.";

/** Digits only: a sign, a decimal point or an exponent is refused rather than rounded. */
const WHOLE_NUMBER_TEXT = /^\d{1,3}$/;

/**
 * A cart quantity (cart spec A14): a whole number from 1 to 99. Form text (" 2 ") is read as
 * digits only, so "-1", "1.5", "1e1" and "" are refused with one message; a number passes the
 * same bounds.
 */
export const cartQuantitySchema = z.preprocess(
  (value) => {
    if (typeof value !== "string") return value;
    const text = value.trim();
    return WHOLE_NUMBER_TEXT.test(text) ? Number(text) : Number.NaN;
  },
  z
    .number(CART_QUANTITY_MESSAGE)
    .int(CART_QUANTITY_MESSAGE)
    .min(1, CART_QUANTITY_MESSAGE)
    .max(CART_LIMITS.maxQuantity, CART_QUANTITY_MESSAGE),
);

const productIdSchema = z.uuid(CART_PRODUCT_MESSAGE);

/**
 * "Add to cart" (cart spec, API Contracts `addToCart`). The quantity defaults to 1: the quick
 * button on a product card sends none, and a missing form field arrives as "".
 */
export const addToCartSchema = z.object({
  productId: productIdSchema,
  quantity: z.preprocess(
    (value) => (value === "" || value === undefined ? 1 : value),
    cartQuantitySchema,
  ),
});

/** A new quantity for a line already in the cart (`updateCartLine`). */
export const updateCartLineSchema = z.object({
  productId: productIdSchema,
  quantity: cartQuantitySchema,
});

/** The line to remove (`removeCartLine`). */
export const removeCartLineSchema = z.object({ productId: productIdSchema });

/**
 * Parses a cart action's input. The product id is a hidden field, so a malformed one (only a
 * forged request sends it) is a form-level "This product is not available." with nothing to
 * highlight, never "Check the highlighted fields." (#48). Other fields go through `parseInput`.
 */
export function parseCartLineInput<T>(schema: z.ZodType<T>, input: { productId?: unknown }): T {
  if (!productIdSchema.safeParse(input.productId).success) {
    throw new ValidationError(CART_PRODUCT_MESSAGE);
  }
  return parseInput(schema, input);
}

/** What the add form posts: text from a form, or numbers; the quantity may be left out. */
export type AddToCartRequest = { productId: string; quantity?: string | number };
export type UpdateCartLineRequest = z.input<typeof updateCartLineSchema>;
export type RemoveCartLineRequest = z.input<typeof removeCartLineSchema>;
