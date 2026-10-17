import { z } from "zod";
import { SHIPPING_COUNTRIES } from "../../domain/orders/order";

const text = (label: string, max: number) =>
  z.string().trim().min(1, `Enter your ${label}.`).max(max, `Use at most ${max} characters.`);

/** Polish postal codes: two digits, a dash, three digits (spec G6: shipping to Poland only). */
const POSTAL_CODE = /^\d{2}-\d{3}$/;

export const CHECKOUT_FORM_FIELDS = [
  "idempotencyKey",
  "customerName",
  "customerEmail",
  "shippingLine1",
  "shippingLine2",
  "shippingCity",
  "shippingPostalCode",
  "shippingCountry",
  "expectedTotalMinor",
  "cartFingerprint",
] as const;

/** A checkout form whose hidden fields are broken was not rendered by this app. */
export const STALE_CHECKOUT_FORM_MESSAGE = "This checkout form is out of date. Reload the page.";

/**
 * The checkout form (cart spec, API Contracts `placeOrder`). The lines never come from the
 * form: they are the cart cookie's, priced by the server. `expectedTotalMinor` is only a
 * staleness check (A6), never a price; `idempotencyKey` is generated on the server when the
 * page renders (A7).
 */
export const checkoutSchema = z.object({
  idempotencyKey: z.uuid(STALE_CHECKOUT_FORM_MESSAGE),
  customerName: text("name", 200),
  customerEmail: z
    .string()
    .trim()
    .max(320, "Use at most 320 characters.")
    .pipe(z.email("Enter a valid email address.")),
  shippingLine1: text("address", 200),
  /** Optional: a blank line is stored as null. */
  shippingLine2: z
    .string()
    .trim()
    .max(200, "Use at most 200 characters.")
    .transform((value) => (value === "" ? null : value)),
  shippingCity: text("city", 100),
  shippingPostalCode: z.string().trim().regex(POSTAL_CODE, "Enter a postal code like 00-950."),
  shippingCountry: z.enum(SHIPPING_COUNTRIES, "We ship to Poland only."),
  expectedTotalMinor: z
    .string()
    .regex(/^\d{1,10}$/, STALE_CHECKOUT_FORM_MESSAGE)
    .transform(Number),
  cartFingerprint: z.string().max(2000, STALE_CHECKOUT_FORM_MESSAGE),
});

/** What the form posts, as text; a missing field is parsed (and refused) like a blank one. */
export type CheckoutRequest = Partial<Record<(typeof CHECKOUT_FORM_FIELDS)[number], string>>;
export type CheckoutInput = z.output<typeof checkoutSchema>;
export type CustomerDetails = Omit<
  CheckoutInput,
  "idempotencyKey" | "expectedTotalMinor" | "cartFingerprint"
>;
