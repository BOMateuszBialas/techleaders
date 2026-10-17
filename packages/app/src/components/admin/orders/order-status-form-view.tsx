import type { AdminOrderTransition, OrderStatus } from "@commerceos/core";
import { Button } from "@/components/ui/button";
import type { ActionState } from "@/lib/action-state";
import { FormMessage } from "../form-feedback";
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

/**
 * The order's status actions in one given state (orders spec, UI/UX "Status actions"): no
 * hooks, so a unit test renders every state; `OrderStatusForm` connects it to
 * `useActionState`. One form per allowed transition only, each posting the status the page
 * shows (`from`, the server's lost-update guard). A cancel or a refund asks for a required
 * confirmation tick first; the server checks it again. The result message sits outside the
 * forms, so it stays visible after the page refreshes with the new status and its new buttons.
 */
export function OrderStatusFormView({ action, state, pending, order }: OrderStatusFormViewProps) {
  return (
    <section aria-labelledby="status-actions-heading" className="flex max-w-xl flex-col gap-3">
      <h2 id="status-actions-heading" className="text-lg font-semibold">
        {STATUS_ACTIONS_HEADING}
      </h2>
      {order.allowedTransitions.length === 0 ? (
        <p className="text-sm">{NO_FURTHER_CHANGES}</p>
      ) : (
        <>
          <p className="text-sm text-muted-foreground">{STATUS_ACTIONS_NOTE}</p>
          {order.allowedTransitions.map((transition) => {
            const confirmId = `confirm-${transition.to}`;
            const confirm = confirmationLabel(transition, order.restockableUnits);
            return (
              <form
                key={`${order.status}-${transition.to}`}
                action={action}
                className="flex flex-col gap-2 rounded-md border p-3"
              >
                <input type="hidden" name="orderId" value={order.id} />
                <input type="hidden" name="from" value={order.status} />
                <input type="hidden" name="to" value={transition.to} />
                {needsConfirmation(transition) ? (
                  <label htmlFor={confirmId} className="flex items-start gap-2 text-sm">
                    <input
                      id={confirmId}
                      type="checkbox"
                      name="confirm"
                      value="yes"
                      required
                      className="mt-0.5 size-4"
                    />
                    <span>{confirm}</span>
                  </label>
                ) : null}
                <div>
                  <Button
                    type="submit"
                    variant={transition.to === "cancelled" ? "destructive" : "default"}
                    disabled={pending}
                  >
                    {transitionButtonLabel(transition)}
                  </Button>
                </div>
              </form>
            );
          })}
        </>
      )}
      <FormMessage state={state} />
    </section>
  );
}
