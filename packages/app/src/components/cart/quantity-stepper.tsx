"use client";

import { useState } from "react";
import { IconMinus, IconPlus } from "@tabler/icons-react";
import { CART_LIMITS } from "@commerceos/core";
import { Button } from "@/components/ui/button";
import { QUANTITY_LABEL } from "./cart-copy";
import { QuantityStepperView } from "./quantity-stepper-view";

/** The clicks keep a quantity inside what a cart line accepts (1 to the cart limit). */
export function clampQuantity(value: number): number {
  return Math.min(CART_LIMITS.maxQuantity, Math.max(1, value));
}

/**
 * The value the control starts from: what the server sent back (so a refused "100" shows as sent,
 * with the server's message), or 1 when there is no usable number.
 */
export function startingQuantity(value: number): number {
  return Number.isFinite(value) ? Math.trunc(value) : 1;
}

/**
 * The product page's quantity, the same control as the cart drawer: "−", the number, "+". The
 * value goes with the form as the hidden field `quantity`; the buttons only change it here, and
 * the server still checks it on submit. `initial` comes from the server (1, or the value the
 * shopper sent before an error), so the caller re-keys this control when it changes.
 */
export function QuantityStepper({ initial }: { initial: number }) {
  const [quantity, setQuantity] = useState(() => startingQuantity(initial));
  return (
    <>
      <input type="hidden" name="quantity" value={quantity} />
      <QuantityStepperView
        label={QUANTITY_LABEL}
        quantity={quantity}
        decrease={
          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            aria-label="Decrease quantity"
            disabled={quantity <= 1}
            onClick={() => setQuantity((current) => clampQuantity(current - 1))}
          >
            <IconMinus aria-hidden="true" />
          </Button>
        }
        increase={
          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            aria-label="Increase quantity"
            disabled={quantity >= CART_LIMITS.maxQuantity}
            onClick={() => setQuantity((current) => clampQuantity(current + 1))}
          >
            <IconPlus aria-hidden="true" />
          </Button>
        }
      />
    </>
  );
}
