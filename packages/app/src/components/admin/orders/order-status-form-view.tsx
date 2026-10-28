import type { AdminOrderTransition, OrderStatus } from "@commerceos/core";
import { Alert } from "@/components/ui/alert";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import type { ActionState } from "@/lib/action-state";
import {
  NO_FURTHER_CHANGES,
  STATUS_ACTIONS_HEADING,
  STATUS_ACTIONS_NOTE,
  confirmationLabel,
  needsConfirmation,
  transitionButtonLabel,
} from "./order-copy";

/** What the status panel needs from the order (`AdminOrderView`). */
export type OrderStatusPanelOrder = {
  id: string;
  status: OrderStatus;
  restockableUnits: number;
  allowedTransitions: AdminOrderTransition[];
};

export type OrderStatusFormViewProps = {
  action: (formData: FormData) => void;
  state: ActionState;
  pending: boolean;
  order: OrderStatusPanelOrder;
};

/** The trigger, the dialog title and the confirming button of a destructive transition. */
type ConfirmCopy = { trigger: string; title: string; confirm: string };

const CANCEL_COPY: ConfirmCopy = {
  trigger: "Cancel order…",
  title: "Cancel this order?",
  confirm: "Cancel order",
};
const REFUND_COPY: ConfirmCopy = {
  trigger: "Record refund…",
  title: "Record this order as refunded?",
  confirm: "Record refund",
};

export const KEEP_ORDER_LABEL = "Keep order";

/**
 * The copy of a transition that `needsConfirmation`. Only a cancel (restocks) and a record-only
 * refund need one (`order-copy.ts`); every other transition is a plain forward form.
 */
export function confirmCopyFor(transition: AdminOrderTransition): ConfirmCopy {
  return transition.to === "cancelled" ? CANCEL_COPY : REFUND_COPY;
}

/** The hidden fields every status form posts: the order, the status shown (`from`), the target. */
function StatusFields({
  order,
  transition,
}: {
  order: OrderStatusPanelOrder;
  transition: AdminOrderTransition;
}) {
  return (
    <>
      <input type="hidden" name="orderId" value={order.id} />
      <input type="hidden" name="from" value={order.status} />
      <input type="hidden" name="to" value={transition.to} />
    </>
  );
}

/**
 * The content of the confirmation dialog for one destructive transition: the same form as the
 * forward ones, with `confirm` = `yes` as a hidden field (the server checks it again). Hook-free,
 * so a unit test renders it inside an open `AlertDialog` root. "Keep order" closes without
 * submitting; only the destructive action submits.
 */
export function OrderStatusDialogBody({
  action,
  pending,
  order,
  transition,
  state,
}: {
  action: (formData: FormData) => void;
  pending: boolean;
  order: OrderStatusPanelOrder;
  transition: AdminOrderTransition;
  /** The last result: an error stays visible here, because the open dialog covers the page. */
  state?: ActionState;
}) {
  const copy = confirmCopyFor(transition);
  return (
    <form action={action} className="flex flex-col gap-group-item">
      <AlertDialogHeader>
        <AlertDialogTitle>{copy.title}</AlertDialogTitle>
        <AlertDialogDescription>
          {confirmationLabel(transition, order.restockableUnits)}
        </AlertDialogDescription>
      </AlertDialogHeader>
      {state ? <OrderStatusMessage state={state} /> : null}
      <StatusFields order={order} transition={transition} />
      <input type="hidden" name="confirm" value="yes" />
      <AlertDialogFooter>
        <AlertDialogCancel>{KEEP_ORDER_LABEL}</AlertDialogCancel>
        <AlertDialogAction type="submit" disabled={pending}>
          {copy.confirm}
        </AlertDialogAction>
      </AlertDialogFooter>
    </form>
  );
}

/** The form-level result: an alert for an error, a status alert for a success; none before a submit. */
export function OrderStatusMessage({ state }: { state: ActionState }) {
  if (state.status === "error") {
    return (
      <Alert variant="destructive" role="alert">
        {state.message}
      </Alert>
    );
  }
  if (state.status === "success") {
    return (
      <Alert variant="success" role="status">
        {state.message}
      </Alert>
    );
  }
  return null;
}

/**
 * The order's status actions in one given state (orders spec, UI/UX "Status actions"): no
 * hooks, so a unit test renders every state; `OrderStatusForm` connects it to
 * `useActionState`. A forward transition is its own form with a default button. A cancel or a
 * refund is an `AlertDialog`: its trigger is a destructive button, and the dialog holds the
 * form that posts the change. The result message sits outside the forms and dialogs, so it
 * stays visible after the page refreshes with the new status and its new buttons.
 */
export function OrderStatusFormView({ action, state, pending, order }: OrderStatusFormViewProps) {
  return (
    <section aria-labelledby="status-actions-heading" className="flex max-w-xl flex-col gap-3">
      <h2 id="status-actions-heading" className="type-h2">
        {STATUS_ACTIONS_HEADING}
      </h2>
      {order.allowedTransitions.length === 0 ? (
        <p className="text-sm">{NO_FURTHER_CHANGES}</p>
      ) : (
        <>
          <p className="text-sm text-muted-foreground">{STATUS_ACTIONS_NOTE}</p>
          {order.allowedTransitions.map((transition) => {
            const key = `${order.status}-${transition.to}`;
            if (needsConfirmation(transition)) {
              return (
                <div key={key} className="rounded-md border p-3">
                  <AlertDialog>
                    <AlertDialogTrigger render={<Button variant="destructive" />}>
                      {confirmCopyFor(transition).trigger}
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <OrderStatusDialogBody
                        action={action}
                        pending={pending}
                        order={order}
                        transition={transition}
                        state={state}
                      />
                    </AlertDialogContent>
                  </AlertDialog>
                </div>
              );
            }
            return (
              <form key={key} action={action} className="flex flex-col gap-2 rounded-md border p-3">
                <StatusFields order={order} transition={transition} />
                <div>
                  <Button type="submit" variant="default" disabled={pending}>
                    {transitionButtonLabel(transition)}
                  </Button>
                </div>
              </form>
            );
          })}
        </>
      )}
      <OrderStatusMessage state={state} />
    </section>
  );
}
