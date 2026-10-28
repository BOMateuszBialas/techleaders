import type { AdminCategoryDetail } from "@commerceos/core";
import Link from "next/link";
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
import { productPath } from "../products/product-copy";
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
  category: Pick<AdminCategoryDetail, "id" | "name" | "productCount" | "products">;
};

/** The section's id for the refusal, referenced by the disabled trigger's `aria-describedby`. */
const REFUSED_ID = "delete-category-refused";

/**
 * The confirmation for an empty category (spec G1, OA-3, OA-5). A plain hook-free view so a
 * unit test can render it; the `AlertDialog` (Base UI, portaled) only mounts it while open.
 * The form holds the hidden `id`, the server result and the confirming button; "Cancel" and
 * Escape close without submitting.
 */
export function DeleteCategoryDialogBody({
  action,
  state,
  pending,
  category,
}: DeleteCategoryViewProps) {
  return (
    <form action={action} className="flex flex-col gap-group-item">
      <AlertDialogHeader>
        <AlertDialogTitle>Delete category {category.name}?</AlertDialogTitle>
        <AlertDialogDescription>
          This removes the category from the store navigation. It cannot be undone.
        </AlertDialogDescription>
      </AlertDialogHeader>
      <input type="hidden" name="id" value={category.id} />
      {state.status === "error" ? (
        <Alert variant="destructive" role="alert">
          {state.message}
        </Alert>
      ) : null}
      <AlertDialogFooter>
        <AlertDialogCancel>Cancel</AlertDialogCancel>
        <AlertDialogAction type="submit" disabled={pending}>
          {pending ? "Deleting…" : "Delete category"}
        </AlertDialogAction>
      </AlertDialogFooter>
    </form>
  );
}

/**
 * The delete section of the category page (spec G1). A used category shows its usage and why
 * deleting is refused, and its delete button is disabled with the reason above it (OA-3, Q3);
 * the server refuses with the same rule, so a stale page cannot bypass it. An empty category
 * opens an `AlertDialog` whose title names the category (OA-2, OA-3).
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
              <li key={product.id}>
                <Link href={productPath(product.id)} className="underline-offset-4 hover:underline">
                  {product.name}
                </Link>
              </li>
            ))}
          </ul>
          {more ? <p className="text-sm text-muted-foreground">{more}</p> : null}
          <Alert id={REFUSED_ID} variant="destructive">
            {DELETE_REFUSED_HINT}
          </Alert>
          <div>
            <Button variant="destructive" disabled aria-describedby={REFUSED_ID}>
              Delete category
            </Button>
          </div>
        </>
      ) : (
        <>
          <p className="text-sm text-muted-foreground">{DELETE_EMPTY_HINT}</p>
          <div>
            <AlertDialog>
              <AlertDialogTrigger render={<Button variant="destructive" />}>
                Delete category
              </AlertDialogTrigger>
              <AlertDialogContent>
                <DeleteCategoryDialogBody
                  action={action}
                  state={state}
                  pending={pending}
                  category={category}
                />
              </AlertDialogContent>
            </AlertDialog>
          </div>
        </>
      )}
    </section>
  );
}
