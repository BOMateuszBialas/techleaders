import Link from "next/link";
import { CART_LIMITS, formatMoney, type PricedCartLine } from "@commerceos/core";
import { FieldError, FormMessage, fieldA11y } from "@/components/admin/form-feedback";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { IDLE_ACTION_STATE, fieldDefault, type ActionState } from "@/lib/action-state";
import { QUANTITY_LABEL, REMOVE_BUTTON, UPDATE_BUTTON } from "./cart-copy";

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
 * with a field error shows it under the input only, not twice.
 */
export function lineMessage(update: ActionState, remove: ActionState): ActionState {
  if (remove.status === "error") return remove;
  const hasFieldErrors = Object.keys(update.fieldErrors ?? {}).length > 0;
  return update.status === "error" && hasFieldErrors ? IDLE_ACTION_STATE : update;
}

/**
 * One cart line in one given state (cart spec, UI/UX "/cart"): name, unit price, a quantity
 * form (1–99), the line total and a remove button. Prices come from the server's catalog
 * read, never from the cookie. No hooks: `CartLineItem` connects both forms to
 * `useActionState`.
 */
export function CartLineView({ line, update, remove }: CartLineViewProps) {
  const errors = update.state.fieldErrors ?? {};
  const inputId = `cart-quantity-${line.productId}`;
  const errorId = `${inputId}-error`;
  return (
    <li className="flex flex-col gap-3 py-4 sm:flex-row sm:items-start sm:justify-between">
      <div className="flex flex-col gap-1">
        <Link href={`/products/${line.slug}`} className="font-medium hover:underline">
          {line.name}
        </Link>
        <p className="text-sm text-muted-foreground">{formatMoney(line.unitPrice)} each</p>
      </div>
      <div className="flex flex-col gap-2 sm:items-end">
        {/* Remounted when the stored quantity changes, so the input starts from it. */}
        <form
          key={line.quantity}
          action={update.action}
          noValidate
          className="flex items-end gap-2"
        >
          <input type="hidden" name="productId" value={line.productId} />
          <div className="flex flex-col gap-1">
            <Label htmlFor={inputId}>{QUANTITY_LABEL}</Label>
            <Input
              id={inputId}
              name="quantity"
              type="number"
              inputMode="numeric"
              min={1}
              max={CART_LIMITS.maxQuantity}
              step={1}
              defaultValue={fieldDefault(update.state, "quantity", String(line.quantity))}
              className="w-20"
              {...fieldA11y(errorId, errors.quantity)}
            />
          </div>
          <Button type="submit" variant="outline" disabled={update.pending}>
            {UPDATE_BUTTON}
          </Button>
        </form>
        <FieldError id={errorId} messages={errors.quantity} />
        <FormMessage state={lineMessage(update.state, remove.state)} />
        <p className="font-semibold" data-testid="line-total">
          {formatMoney(line.lineTotal)}
        </p>
        <form action={remove.action}>
          <input type="hidden" name="productId" value={line.productId} />
          <Button
            type="submit"
            variant="ghost"
            size="sm"
            disabled={remove.pending}
            aria-label={`${REMOVE_BUTTON} ${line.name}`}
          >
            {REMOVE_BUTTON}
          </Button>
        </form>
      </div>
    </li>
  );
}
