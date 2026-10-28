import type { OrderStatus } from "@commerceos/core";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Field, FieldError, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { fieldDefault, type ActionState } from "@/lib/action-state";
import { fieldA11y } from "@/lib/field-a11y";
import {
  CONFIRMING_PAYMENT,
  CONFIRM_PAYMENT_BUTTON,
  LOOKUP_BUTTON,
  LOOKUP_LABEL,
  PAYMENT_TEST_NOTE,
  orderStatusLabel,
} from "./checkout-copy";
import { orderStatusBadgeVariant } from "./order-status-badge";

type FormViewProps = {
  action: (formData: FormData) => void;
  state: ActionState;
  pending: boolean;
};

/**
 * The one payment note (storefront v2, R11, R03): a static, visible, not dismissible note. No
 * money moves anywhere. A standing note has no role (retrofit B2.18): it is the `demo` alert.
 */
export function PaymentTestNote() {
  return (
    <Alert variant="demo">
      <AlertDescription>{PAYMENT_TEST_NOTE}</AlertDescription>
    </Alert>
  );
}

/**
 * The order's status as text (never conveyed by colour alone, tokeny.md §7 rule 10). The variant
 * comes from `orderStatusBadgeVariant`; `shipped` is an outline badge with strong text.
 */
export function OrderStatusBadge({ status }: { status: OrderStatus }) {
  return (
    <Badge
      variant={orderStatusBadgeVariant(status)}
      className={status === "shipped" ? "font-semibold" : undefined}
    >
      {orderStatusLabel(status)}
    </Badge>
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
      {state.status === "error" ? (
        <Alert variant="destructive" role="alert">
          <AlertDescription>{state.message}</AlertDescription>
        </Alert>
      ) : null}
      <div>
        <Button type="submit" variant="action" disabled={pending} aria-busy={pending}>
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
      <Field>
        <FieldLabel htmlFor="lookup-reference">{LOOKUP_LABEL}</FieldLabel>
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
        <FieldError id="lookup-reference-error">{errors.reference?.join(" ")}</FieldError>
      </Field>
      <div>
        <Button type="submit" disabled={pending}>
          {LOOKUP_BUTTON}
        </Button>
      </div>
    </form>
  );
}
