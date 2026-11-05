import type { ReactNode } from "react";

export type QuantityStepperViewProps = {
  /** Accessible name of the quantity, e.g. "Quantity of Vortex Wireless Mouse". */
  label: string;
  quantity: number;
  /** The "−" control, as the caller renders it (a form or a button). */
  decrease: ReactNode;
  /** The "+" control, as the caller renders it. */
  increase: ReactNode;
};

/**
 * The quantity control shared by the cart drawer, the cart page and the product page: "−", the
 * number, "+" in one row (storefront visual polish, 2026-11-05). No hooks and no behaviour of its
 * own: the caller decides whether a control submits a form (cart lines) or changes local state
 * (product page).
 */
export function QuantityStepperView({
  label,
  quantity,
  decrease,
  increase,
}: QuantityStepperViewProps) {
  return (
    <div className="flex items-center gap-related">
      {decrease}
      <output aria-label={label} className="min-w-8 text-center tabular-nums">
        {quantity}
      </output>
      {increase}
    </div>
  );
}
