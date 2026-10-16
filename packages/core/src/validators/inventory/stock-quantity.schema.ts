import { z } from "zod";

/** The largest stock quantity the admin accepts (admin catalog spec, `setStockSchema`). */
export const MAX_STOCK_QUANTITY = 1_000_000;

export const STOCK_QUANTITY_MESSAGE = "Enter a whole number from 0 to 1,000,000.";

/** Digits only: a sign, a decimal point or an exponent is refused rather than rounded. */
const WHOLE_NUMBER_TEXT = /^\d{1,7}$/;

/**
 * A stock quantity: a whole number from 0 to `MAX_STOCK_QUANTITY`. Form text ("8", " 0 ") is
 * read as digits only, so "-1", "1.5", "1e3" and "" are refused with one message; a number
 * passes the same bounds. Shared by the initial stock of a new product and the stock panel.
 */
export const stockQuantitySchema = z.preprocess(
  (value) => {
    if (typeof value !== "string") return value;
    const text = value.trim();
    return WHOLE_NUMBER_TEXT.test(text) ? Number(text) : Number.NaN;
  },
  z
    .number(STOCK_QUANTITY_MESSAGE)
    .int(STOCK_QUANTITY_MESSAGE)
    .min(0, STOCK_QUANTITY_MESSAGE)
    .max(MAX_STOCK_QUANTITY, STOCK_QUANTITY_MESSAGE),
);
