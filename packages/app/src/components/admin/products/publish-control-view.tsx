import type { AdminProduct } from "@commerceos/core";
import { Button } from "@/components/ui/button";
import type { ActionState } from "@/lib/action-state";
import { FormMessage } from "../form-feedback";
import { publishHelp, UNPUBLISH_HELP } from "./product-copy";

export type PublishControlViewProps = {
  action: (formData: FormData) => void;
  state: ActionState;
  pending: boolean;
  product: Pick<AdminProduct, "id" | "slug" | "status" | "stockQuantity">;
};

/**
 * One button that publishes or unpublishes, with its outcome stated next to it before the
 * click (spec G11). No confirmation dialog: the change is reversible.
 */
export function PublishControlView({ action, state, pending, product }: PublishControlViewProps) {
  const publishing = product.status === "draft";
  const label = publishing ? "Publish" : "Unpublish";

  return (
    <section aria-labelledby="publish-heading" className="flex max-w-xl flex-col gap-3">
      <h2 id="publish-heading" className="type-h2">
        Store visibility
      </h2>
      <form action={action} className="flex flex-col gap-3">
        <input type="hidden" name="id" value={product.id} />
        <input type="hidden" name="status" value={publishing ? "published" : "draft"} />
        <p id="publish-help" className="text-sm text-muted-foreground">
          {publishing ? publishHelp(product) : UNPUBLISH_HELP}
        </p>
        <FormMessage state={state} />
        <div>
          <Button
            type="submit"
            variant={publishing ? "default" : "outline"}
            disabled={pending}
            aria-describedby="publish-help"
          >
            {pending ? `${label}ing…` : label}
          </Button>
        </div>
      </form>
    </section>
  );
}
