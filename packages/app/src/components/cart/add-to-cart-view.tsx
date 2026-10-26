import type { ComponentProps } from "react";
import { CART_LIMITS } from "@commerceos/core";
import { Button } from "@/components/ui/button";
import { FieldError } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { fieldDefault, type ActionState } from "@/lib/action-state";
import { fieldA11y } from "@/lib/field-a11y";
import { CartFormMessage } from "./cart-form-message";
import {
  ADD_TO_CART_BUTTON,
  ADDING_TO_CART,
  OUT_OF_STOCK_BUTTON,
  QUANTITY_LABEL,
} from "./cart-copy";

export type AddToCartViewProps = {
  action: (formData: FormData) => void;
  state: ActionState;
  pending: boolean;
  productId: string;
  /** False for an out-of-stock product: the button is disabled and says so (spec G8). */
  available: boolean;
  /** The product page shows a quantity input; a product card adds one (spec G8). */
  withQuantity: boolean;
  /**
   * The submit button's colour and size (retrofit Phase 1, owner Q4): `action` on the product
   * page (the purchase step), `outline` `sm` in a product card. Defaults to the default button.
   */
  variant?: ComponentProps<typeof Button>["variant"];
  size?: ComponentProps<typeof Button>["size"];
};

/**
 * "Add to cart" in one given state (cart spec, UI/UX): no hooks, so a unit test renders every
 * state; `AddToCart` connects it to `useActionState`. The form posts only the product id and
 * the quantity, never a price. After a submit the shopper stays on the page and sees "Added to
 * cart." (G9). `noValidate` lets the server explain a refused quantity under the field. The
 * input caps at 99, not at the stock: shoppers never see exact stock (storefront spec Q7)
 * unless they ask for more than is left.
 */
export function AddToCartView({
  action,
  state,
  pending,
  productId,
  available,
  withQuantity,
  variant,
  size,
}: AddToCartViewProps) {
  if (!available) {
    return (
      <Button type="button" variant="outline" disabled>
        {OUT_OF_STOCK_BUTTON}
      </Button>
    );
  }
  const errors = state.fieldErrors ?? {};
  const inputId = `quantity-${productId}`;
  const errorId = `${inputId}-error`;
  return (
    <form action={action} noValidate className="flex flex-col gap-2">
      <input type="hidden" name="productId" value={productId} />
      {withQuantity ? (
        <div className="flex flex-col gap-2">
          <Label htmlFor={inputId}>{QUANTITY_LABEL}</Label>
          <Input
            id={inputId}
            name="quantity"
            type="number"
            inputMode="numeric"
            min={1}
            max={CART_LIMITS.maxQuantity}
            step={1}
            defaultValue={fieldDefault(state, "quantity", "1")}
            className="w-24"
            {...fieldA11y(errorId, errors.quantity)}
          />
          <FieldError id={errorId}>{errors.quantity?.join(" ")}</FieldError>
        </div>
      ) : null}
      <div>
        <Button type="submit" variant={variant} size={size} disabled={pending} aria-busy={pending}>
          {pending ? ADDING_TO_CART : ADD_TO_CART_BUTTON}
        </Button>
      </div>
      <CartFormMessage state={state} />
    </form>
  );
}
