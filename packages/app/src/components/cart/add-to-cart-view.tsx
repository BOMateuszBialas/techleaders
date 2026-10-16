import { CART_LIMITS } from "@commerceos/core";
import { FieldError, FormMessage, fieldA11y } from "@/components/admin/form-feedback";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { fieldDefault, type ActionState } from "@/lib/action-state";
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
          <FieldError id={errorId} messages={errors.quantity} />
        </div>
      ) : null}
      <div>
        <Button type="submit" disabled={pending}>
          {pending ? ADDING_TO_CART : ADD_TO_CART_BUTTON}
        </Button>
      </div>
      <FormMessage state={state} />
    </form>
  );
}
