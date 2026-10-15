import { CATEGORY_DESCRIPTION_MAX_LENGTH, CATEGORY_NAME_MAX_LENGTH } from "@commerceos/core";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { fieldDefault, type ActionState } from "@/lib/action-state";
import { FieldError, FormMessage, fieldA11y } from "../form-feedback";
import { SLUG_CHANGE_WARNING, SLUG_HINT } from "./category-copy";

/** The stored category an edit form starts from. */
export type CategoryFormCategory = {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  productCount: number;
};

export type CategoryFormViewProps = {
  action: (formData: FormData) => void;
  state: ActionState;
  pending: boolean;
  /** Absent on the "new category" page. */
  category?: CategoryFormCategory;
};

/**
 * The category form in one given state (spec A15): no hooks, so a unit test renders every
 * state directly. `CategoryForm` connects it to `useActionState`.
 */
export function CategoryFormView({ action, state, pending, category }: CategoryFormViewProps) {
  const errors = state.fieldErrors ?? {};
  const slugHints = ["category-slug-hint"];
  // G13: the slug of a used category is part of store URLs, and there are no redirects.
  if (category && category.productCount > 0) slugHints.push("category-slug-warning");

  return (
    <form action={action} className="flex max-w-xl flex-col gap-4">
      {category ? <input type="hidden" name="id" value={category.id} /> : null}
      <div className="flex flex-col gap-2">
        <Label htmlFor="category-name">Name</Label>
        <Input
          id="category-name"
          name="name"
          required
          maxLength={CATEGORY_NAME_MAX_LENGTH}
          defaultValue={fieldDefault(state, "name", category?.name)}
          {...fieldA11y("category-name-error", errors.name)}
        />
        <FieldError id="category-name-error" messages={errors.name} />
      </div>
      <div className="flex flex-col gap-2">
        <Label htmlFor="category-slug">Slug</Label>
        <Input
          id="category-slug"
          name="slug"
          defaultValue={fieldDefault(state, "slug", category?.slug)}
          {...fieldA11y("category-slug-error", errors.slug, slugHints)}
        />
        <p id="category-slug-hint" className="text-sm text-muted-foreground">
          {SLUG_HINT}
        </p>
        {slugHints.length > 1 ? (
          <p id="category-slug-warning" className="text-sm text-amber-700 dark:text-amber-400">
            {SLUG_CHANGE_WARNING}
          </p>
        ) : null}
        <FieldError id="category-slug-error" messages={errors.slug} />
      </div>
      <div className="flex flex-col gap-2">
        <Label htmlFor="category-description">Description</Label>
        <Textarea
          id="category-description"
          name="description"
          maxLength={CATEGORY_DESCRIPTION_MAX_LENGTH}
          defaultValue={fieldDefault(state, "description", category?.description ?? "")}
          {...fieldA11y("category-description-error", errors.description)}
        />
        <FieldError id="category-description-error" messages={errors.description} />
      </div>
      <FormMessage state={state} />
      <div>
        <Button type="submit" disabled={pending}>
          {pending ? "Saving…" : category ? "Save changes" : "Create category"}
        </Button>
      </div>
    </form>
  );
}
