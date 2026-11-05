import type { ComponentProps } from "react";
import { cn } from "cn";
import { Button } from "@/components/ui/button";
import { FieldError } from "@/components/ui/field";
import { fieldDefault, type ActionState } from "@/lib/action-state";
import { CartFormMessage } from "./cart-form-message";
import { QuantityStepper } from "./quantity-stepper";
import { ADD_TO_CART_BUTTON, ADDING_TO_CART, OUT_OF_STOCK_BUTTON } from "./cart-copy";

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
  /** The submit button spans the full width of its container (product cards). */
  fill?: boolean;
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
  fill = false,
}: AddToCartViewProps) {
  if (!available) {
    return (
      <Button type="button" variant="outline" disabled className={fill ? "w-full" : undefined}>
        {OUT_OF_STOCK_BUTTON}
      </Button>
    );
  }
  const errors = state.fieldErrors ?? {};
  const errorId = `quantity-${productId}-error`;
  const initialQuantity = Number(fieldDefault(state, "quantity", "1"));
  const submit = (
    <Button
      type="submit"
      variant={variant}
      size={size}
      disabled={pending}
      aria-busy={pending}
      className={cn(fill && "w-full", withQuantity && "flex-1")}
    >
      {pending ? ADDING_TO_CART : ADD_TO_CART_BUTTON}
    </Button>
  );
  return (
    <form action={action} noValidate className="flex flex-col gap-2">
      <input type="hidden" name="productId" value={productId} />
      {withQuantity ? (
        <div className="flex flex-col gap-2">
          {/* The quantity and the button share one line; the error sits under both. */}
          <div className="flex items-center gap-3">
            <QuantityStepper key={initialQuantity} initial={initialQuantity} />
            {submit}
          </div>
          <FieldError id={errorId}>{errors.quantity?.join(" ")}</FieldError>
        </div>
      ) : (
        <div>{submit}</div>
      )}
      <CartFormMessage state={state} />
    </form>
  );
}
