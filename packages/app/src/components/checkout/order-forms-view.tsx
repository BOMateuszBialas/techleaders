import type { OrderStatus } from "@commerceos/core";
import { FieldError, FormMessage, fieldA11y } from "@/components/admin/form-feedback";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { fieldDefault, type ActionState } from "@/lib/action-state";
import {
  CONFIRMING_PAYMENT,
  CONFIRM_PAYMENT_BUTTON,
  LOOKUP_BUTTON,
  LOOKUP_LABEL,
  PAYMENT_TEST_NOTE,
  orderStatusLabel,
} from "./checkout-copy";

type FormViewProps = {
  action: (formData: FormData) => void;
  state: ActionState;
  pending: boolean;
};

/**
 * The one payment note (storefront v2, R11, R03): a static, visible, not dismissible `note`. No
 * money moves anywhere.
 */
export function PaymentTestNote() {
  return (
    <p
      role="note"
      className="rounded-md border border-demo bg-demo-surface p-3 text-sm font-medium text-demo"
    >
      {PAYMENT_TEST_NOTE}
    </p>
  );
}

/** The order's status as text (never conveyed by colour alone). */
export function OrderStatusBadge({ status }: { status: OrderStatus }) {
  return (
    <Badge variant={status === "paid" ? "secondary" : "outline"}>{orderStatusLabel(status)}</Badge>
  );
}

/** The one-button demo payment (A9): only the reference is posted, no card field exists. */
export function PayFormView({
  action,
  state,
  pending,
  reference,
}: FormViewProps & { reference: string }) {
  return (
    <form action={action} className="flex flex-col gap-3">
      <input type="hidden" name="reference" value={reference} />
      <FormMessage state={state} />
      <div>
        <Button type="submit" disabled={pending}>
          {pending ? CONFIRMING_PAYMENT : CONFIRM_PAYMENT_BUTTON}
        </Button>
      </div>
    </form>
  );
}

/** The order lookup form: one field, format-checked by the server (spec UI/UX "/orders/lookup"). */
export function LookupFormView({ action, state, pending }: FormViewProps) {
  const errors = state.fieldErrors ?? {};
  return (
    <form action={action} noValidate className="flex max-w-md flex-col gap-3">
      <div className="flex flex-col gap-2">
        <Label htmlFor="lookup-reference">{LOOKUP_LABEL}</Label>
        <Input
          id="lookup-reference"
          name="reference"
          autoComplete="off"
          spellCheck={false}
          placeholder="CO-XXXXX-XXXXX-XXXXX-XXXXX"
          className="font-mono"
          defaultValue={fieldDefault(state, "reference")}
          {...fieldA11y("lookup-reference-error", errors.reference)}
        />
        <FieldError id="lookup-reference-error" messages={errors.reference} />
      </div>
      <div>
        <Button type="submit" disabled={pending}>
          {LOOKUP_BUTTON}
        </Button>
      </div>
    </form>
  );
}
