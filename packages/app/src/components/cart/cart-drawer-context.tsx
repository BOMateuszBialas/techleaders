"use client";

import {
  createContext,
  useContext,
  useMemo,
  useReducer,
  type Dispatch,
  type ReactNode,
} from "react";
import {
  cartDrawerReducer,
  INITIAL_CART_DRAWER_STATE,
  type CartDrawerAction,
  type CartDrawerState,
} from "./cart-drawer-state";

/**
 * The cart drawer's shared state (storefront v2, Phase 2): one React context, mounted once in the
 * storefront layout. The header link and every "Add to cart" dispatch to it; the drawer reads it.
 * A context is the smallest shared state here (no store library, spec "Drawer state").
 */
export type CartDrawerContextValue = {
  state: CartDrawerState;
  dispatch: Dispatch<CartDrawerAction>;
};

const CartDrawerContext = createContext<CartDrawerContextValue | null>(null);

export function CartDrawerProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(cartDrawerReducer, INITIAL_CART_DRAWER_STATE);
  const value = useMemo(() => ({ state, dispatch }), [state]);
  return <CartDrawerContext.Provider value={value}>{children}</CartDrawerContext.Provider>;
}

/** The drawer's state, or `null` outside the provider (the link then just follows `/cart`). */
export function useCartDrawer(): CartDrawerContextValue | null {
  return useContext(CartDrawerContext);
}
