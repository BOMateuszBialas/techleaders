import Link from "next/link";
import { IconMinus, IconPlus, IconTrash } from "@tabler/icons-react";
import { formatMoney, type PricedCartLine } from "@commerceos/core";
import { ProductThumbnail } from "@/components/catalog/product-thumbnail";
import { Button } from "@/components/ui/button";
import { FieldError } from "@/components/ui/field";
import { IDLE_ACTION_STATE, type ActionState } from "@/lib/action-state";
import { CartFormMessage } from "./cart-form-message";
import { REMOVE_BUTTON } from "./cart-copy";
import { QuantityStepperView } from "./quantity-stepper-view";

type FormProps = {
  action: (formData: FormData) => void;
  state: ActionState;
  pending: boolean;
};

export type CartLineViewProps = {
  line: PricedCartLine;
  update: FormProps;
  remove: FormProps;
};

/**
 * The one message a line shows: a failed remove, else the update's result. An update refused
 * with a field error shows it under the quantity only, not twice.
 */
export function lineMessage(update: ActionState, remove: ActionState): ActionState {
  if (remove.status === "error") return remove;
  const hasFieldErrors = Object.keys(update.fieldErrors ?? {}).length > 0;
  return update.status === "error" && hasFieldErrors ? IDLE_ACTION_STATE : update;
}

/**
 * One cart line on the cart page (cart spec, UI/UX "/cart"): the photo and the name with the unit
 * price on the left; on the right, in one line, the quantity ("−" and "+", the same control as the
 * drawer), the line total and the trash button. Prices come from the server's catalog read, never
 * from the cookie. No hooks: `CartLineItem` connects both forms to `useActionState`.
 */
export function CartLineView({ line, update, remove }: CartLineViewProps) {
  const errors = update.state.fieldErrors ?? {};
  const errorId = `cart-quantity-${line.productId}-error`;
  return (
    <li className="flex flex-col gap-3 py-4 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex items-start gap-3">
        <ProductThumbnail imageUrl={line.imageUrl} name={line.name} widthClassName="w-20" />
        <div className="flex flex-col gap-1">
          <Link href={`/products/${line.slug}`} className="font-medium hover:underline">
            {line.name}
          </Link>
          <p className="text-sm text-muted-foreground">{formatMoney(line.unitPrice)} each</p>
        </div>
      </div>
      <div className="flex flex-col items-end gap-2">
        <QuantityStepperView
          label={`Quantity of ${line.name}`}
          quantity={line.quantity}
          decrease={
            <form action={update.action}>
              <input type="hidden" name="productId" value={line.productId} />
              <input type="hidden" name="quantity" value={line.quantity - 1} />
              <Button
                type="submit"
                variant="ghost"
                size="icon-sm"
                aria-label={`Decrease quantity of ${line.name}`}
                disabled={line.quantity <= 1 || update.pending}
              >
                <IconMinus aria-hidden="true" />
              </Button>
            </form>
          }
          increase={
            <form action={update.action}>
              <input type="hidden" name="productId" value={line.productId} />
              <input type="hidden" name="quantity" value={line.quantity + 1} />
              <Button
                type="submit"
                variant="ghost"
                size="icon-sm"
                aria-label={`Increase quantity of ${line.name}`}
                disabled={update.pending}
              >
                <IconPlus aria-hidden="true" />
              </Button>
            </form>
          }
        />
        <div className="flex items-center gap-2">
          <p className="font-semibold tabular-nums" data-testid="line-total">
            {formatMoney(line.lineTotal)}
          </p>
          <form action={remove.action}>
            <input type="hidden" name="productId" value={line.productId} />
            <Button
              type="submit"
              variant="ghost"
              size="icon"
              className="size-11 text-foreground"
              disabled={remove.pending}
              aria-label={`${REMOVE_BUTTON} ${line.name}`}
              title={REMOVE_BUTTON}
            >
              <IconTrash aria-hidden="true" />
            </Button>
          </form>
        </div>
        <FieldError id={errorId}>{errors.quantity?.join(" ")}</FieldError>
        <CartFormMessage state={lineMessage(update.state, remove.state)} />
      </div>
    </li>
  );
}
