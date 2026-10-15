import type { AdminCategoryDetail } from "@commerceos/core";
import { Button } from "@/components/ui/button";
import type { ActionState } from "@/lib/action-state";
import { FormMessage } from "../form-feedback";
import {
  DELETE_EMPTY_HINT,
  DELETE_REFUSED_HINT,
  moreProductsMessage,
  usedByMessage,
} from "./category-copy";

export type DeleteCategoryViewProps = {
  action: (formData: FormData) => void;
  state: ActionState;
  pending: boolean;
  category: Pick<AdminCategoryDetail, "id" | "productCount" | "products">;
};

/**
 * The delete section of the category page (spec G1). A used category shows its usage and
 * why deleting is refused; the button stays, and the server refuses with the same rule, so
 * a stale page cannot bypass it.
 */
export function DeleteCategoryView({ action, state, pending, category }: DeleteCategoryViewProps) {
  const more = moreProductsMessage(category.productCount, category.products.length);

  return (
    <section aria-labelledby="delete-category-heading" className="flex max-w-xl flex-col gap-3">
      <h2 id="delete-category-heading" className="text-lg font-semibold">
        Delete category
      </h2>
      {category.productCount > 0 ? (
        <>
          <p className="text-sm font-medium">{usedByMessage(category.productCount)}</p>
          <ul aria-label="Products in this category" className="list-disc pl-5 text-sm">
            {category.products.map((product) => (
              <li key={product.id}>{product.name}</li>
            ))}
          </ul>
          {more ? <p className="text-sm text-muted-foreground">{more}</p> : null}
          <p className="text-sm text-muted-foreground">{DELETE_REFUSED_HINT}</p>
        </>
      ) : (
        <p className="text-sm text-muted-foreground">{DELETE_EMPTY_HINT}</p>
      )}
      <form action={action} className="flex flex-col gap-3">
        <input type="hidden" name="id" value={category.id} />
        <FormMessage state={state} />
        <div>
          <Button type="submit" variant="destructive" disabled={pending}>
            {pending ? "Deleting…" : "Delete category"}
          </Button>
        </div>
      </form>
    </section>
  );
}
