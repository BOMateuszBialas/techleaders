/**
 * Who is reading an order by its public reference (E07 spec A2, A14): the signed-in customer's
 * id, or `null` for a guest (no customer session, or a session-read failure, A24). The app takes
 * it only from the session, never from a URL, form or body.
 */
export type OrderViewer = { customerId: string | null };

/** A guest viewer: what every public path uses when no customer session is present. */
export const GUEST_ORDER_VIEWER: OrderViewer = { customerId: null };

/**
 * The ownership rule for reads by reference (E07 spec A2): a guest order (`customerId` null)
 * keeps the bearer-reference rule of the cart spec (A8); an account order opens only for its own
 * customer. Callers turn `false` into the same "not found" as an unknown reference, so a foreign
 * order is indistinguishable from a missing one.
 */
export function canViewOrder(order: { customerId: string | null }, viewer: OrderViewer): boolean {
  return order.customerId === null || order.customerId === viewer.customerId;
}

/**
 * The placing principal folded into a checkout's request fingerprint (E07 spec A15), so a form
 * replayed by another principal never matches the original order's fingerprint.
 */
export function orderPrincipal(customerId: string | null): string {
  return customerId === null ? "guest" : `customer:${customerId}`;
}
