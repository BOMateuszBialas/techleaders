import { z } from "zod";
import { stockQuantitySchema } from "./stock-quantity.schema";

/**
 * A manual stock change (admin catalog spec A5, API Contracts `adjustStock`): the absolute
 * quantity to set, and the quantity the form showed, so the write succeeds only when the
 * stored value still equals it. The product id is checked by the use case (a malformed id is
 * "not found", like every other admin record).
 */
export const setStockSchema = z.object({
  productId: z.string().trim(),
  expectedQuantity: stockQuantitySchema,
  newQuantity: stockQuantitySchema,
});

/** What the stock form posts, as text, or the same values as numbers. */
export type SetStockRequest = z.input<typeof setStockSchema>;
export type SetStockInput = z.output<typeof setStockSchema>;
