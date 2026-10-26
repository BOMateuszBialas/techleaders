/** Shopper-facing cart texts (cart spec, UI/UX), in one place for the views and their tests. */

export const ADD_TO_CART_BUTTON = "Add to cart";
export const ADDING_TO_CART = "Adding…";
export const OUT_OF_STOCK_BUTTON = "Out of stock";
export const ADDED_TO_CART_MESSAGE = "Added to cart.";
export const QUANTITY_LABEL = "Quantity";

export const CART_HEADING = "Your cart";
export const EMPTY_CART_MESSAGE = "Your cart is empty.";
export const UPDATE_BUTTON = "Update";
export const REMOVE_BUTTON = "Remove";
export const CART_UPDATED_MESSAGE = "Cart updated.";
export const LINE_REMOVED_MESSAGE = "Removed from your cart.";
export const PRICES_CONFIRMED_NOTE = "Prices are confirmed at checkout.";
export const CHECKOUT_LINK = "Checkout";
export const COOKIES_REQUIRED_NOTE = "The cart is kept in a cookie, so cookies must be enabled.";
export const CART_UNAVAILABLE_MESSAGE =
  "The cart is temporarily unavailable. Please try again later.";
/** OA-5 (retrofit Phase 1): the title of the unreadable-cart state; the retry label is "Try again". */
export const CART_UNAVAILABLE_TITLE = "Cart unavailable";
export const TRY_AGAIN_LINK = "Try again";
export const VIEW_FULL_CART_LINK = "View full cart";
export const BROWSE_ALL_PRODUCTS_LINK = "Browse all products";
export const SHOP_ALL_PRODUCTS_LINK = "Shop all products";
export const CART_LOADING_LABEL = "Loading cart";

/** The header link's accessible name, e.g. "Cart, 3 items". */
export function cartLinkLabel(itemCount: number): string {
  return `Cart, ${itemCount} ${itemCount === 1 ? "item" : "items"}`;
}
