import type { RefObject } from "react";
import type { FormAction } from "@/lib/action-state";
import { ADDED_TO_CART_MESSAGE, CART_HEADING } from "./cart-copy";

/**
 * The cart drawer's state and its pure rules (storefront v2, spec Phase 2). No React runtime
 * here: the reducer and the handler factories are unit-tested with fakes, and the provider and
 * the components only connect them to the DOM.
 */

export type CartDrawerState = {
  open: boolean;
  /** A line shown inside the drawer, e.g. "Added to cart." after an add (spec Accessibility). */
  notice: string | null;
  /** Where focus goes when the drawer closes: the trigger that opened it (spec A14). */
  returnFocusTo: RefObject<HTMLElement | null>;
};

export type CartDrawerAction =
  { type: "open"; trigger: HTMLElement | null; notice: string | null } | { type: "close" };

export const INITIAL_CART_DRAWER_STATE: CartDrawerState = {
  open: false,
  notice: null,
  returnFocusTo: { current: null },
};

export function cartDrawerReducer(
  state: CartDrawerState,
  action: CartDrawerAction,
): CartDrawerState {
  if (action.type === "open") {
    return { open: true, notice: action.notice, returnFocusTo: { current: action.trigger } };
  }
  return { ...state, open: false, notice: null };
}

/** The drawer's title, "Your cart (n)" (spec UI/UX "Drawer"). */
export function drawerTitle(itemCount: number): string {
  return `${CART_HEADING} (${itemCount})`;
}

/** The fields of a mouse event the drawer reads (a React mouse event satisfies this). */
export type DrawerClickEvent = {
  button: number;
  metaKey: boolean;
  ctrlKey: boolean;
  shiftKey: boolean;
  altKey: boolean;
  currentTarget: HTMLElement | null;
  preventDefault: () => void;
};

/**
 * A plain left click: the modifier keys (new tab, new window, download) keep the link's own
 * behaviour, so the shopper can still open `/cart` in a new tab.
 */
export function isPlainPrimaryClick(
  event: Omit<DrawerClickEvent, "currentTarget" | "preventDefault">,
): boolean {
  return event.button === 0 && !event.metaKey && !event.ctrlKey && !event.shiftKey && !event.altKey;
}

/**
 * The header cart link's click: a plain click opens the drawer and keeps the page; anything else
 * (and a click without JavaScript, which never reaches this) follows the link to `/cart`.
 */
export function openDrawerOnPlainClick(dispatch: (action: CartDrawerAction) => void) {
  return (event: DrawerClickEvent): void => {
    if (!isPlainPrimaryClick(event)) return;
    event.preventDefault();
    dispatch({ type: "open", trigger: event.currentTarget, notice: null });
  };
}

/** The element that has focus right now, or `null` (the focused element returns to it on close). */
function focusedElement(): HTMLElement | null {
  const active = document.activeElement;
  return active instanceof HTMLElement ? active : null;
}

/**
 * Wraps the add-to-cart action: a successful add opens the drawer with "Added to cart." (Q6).
 * The trigger is read before the action runs, because a pending submit button is disabled and
 * loses focus while the add is in progress. A failed add (a refused quantity, a sold-out product)
 * keeps the drawer closed and shows its message under the form, as before.
 */
export function openDrawerAfterAdd(
  action: FormAction,
  dispatch: (action: CartDrawerAction) => void,
): FormAction {
  return async (previous, formData) => {
    const trigger = focusedElement();
    const result = await action(previous, formData);
    if (result.status === "success") {
      dispatch({ type: "open", trigger, notice: ADDED_TO_CART_MESSAGE });
    }
    return result;
  };
}

/** Base UI reports every request to close (Escape, a click on the backdrop, the X). */
export function closeDrawerOnRequest(dispatch: (action: CartDrawerAction) => void) {
  return (open: boolean): void => {
    if (!open) dispatch({ type: "close" });
  };
}
