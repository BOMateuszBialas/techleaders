/** Shown under the lookup field for anything that is not a reference. */
export const REFERENCE_FORMAT_MESSAGE = "Enter a reference like CO-XXXXX-XXXXX-XXXXX-XXXXX.";

/** The order URLs (cart spec, UI/UX), protected surfaces listed in BACKWARD_COMPATIBILITY.md. */
export const orderPaths = {
  pay: (reference: string) => `/checkout/pay/${encodeURIComponent(reference)}`,
  order: (reference: string) => `/orders/${encodeURIComponent(reference)}`,
  confirmation: (reference: string) => `/orders/${encodeURIComponent(reference)}?paid=1`,
  lookup: "/orders/lookup",
};
