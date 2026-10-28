import { CATEGORY_DESCRIPTION_MAX_LENGTH, CATEGORY_NAME_MAX_LENGTH } from "@commerceos/core";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Field, FieldDescription, FieldError, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { fieldDefault, type ActionState } from "@/lib/action-state";
import { fieldA11y } from "@/lib/field-a11y";
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
 * The form-level result: `role="alert"` for an error after a submit, `role="status"` for a
 * success, nothing before the first submit (Component decisions, form-level result).
 */
function CategoryFormResult({ state }: { state: ActionState }) {
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
 * The category form in one given state (spec A15): no hooks, so a unit test renders every
 * state directly. `CategoryForm` connects it to `useActionState`.
 */
export function CategoryFormView({ action, state, pending, category }: CategoryFormViewProps) {
  const errors = state.fieldErrors ?? {};
  const stored: Partial<CategoryFormCategory> = category ?? {};
  const slugHints = ["category-slug-hint"];
  // G13: the slug of a used category is part of store URLs, and there are no redirects.
  const slugChangeWarning = category !== undefined && category.productCount > 0;
  if (slugChangeWarning) slugHints.push("category-slug-warning");

  return (
    <form action={action} className="flex max-w-xl flex-col gap-4">
      {category ? <input type="hidden" name="id" value={category.id} /> : null}
      <Field>
        <FieldLabel htmlFor="category-name">Name</FieldLabel>
        <Input
          id="category-name"
          name="name"
          required
          maxLength={CATEGORY_NAME_MAX_LENGTH}
          defaultValue={fieldDefault(state, "name", stored.name)}
          {...fieldA11y("category-name-error", errors.name)}
        />
        <FieldError id="category-name-error">{errors.name?.join(" ")}</FieldError>
      </Field>
      <Field>
        <FieldLabel htmlFor="category-slug">Slug</FieldLabel>
        <Input
          id="category-slug"
          name="slug"
          defaultValue={fieldDefault(state, "slug", stored.slug)}
          {...fieldA11y("category-slug-error", errors.slug, slugHints)}
        />
        <FieldDescription id="category-slug-hint">{SLUG_HINT}</FieldDescription>
        {slugChangeWarning ? (
          <Alert id="category-slug-warning" variant="warning">
            {SLUG_CHANGE_WARNING}
          </Alert>
        ) : null}
        <FieldError id="category-slug-error">{errors.slug?.join(" ")}</FieldError>
      </Field>
      <Field>
        <FieldLabel htmlFor="category-description">Description</FieldLabel>
        <Textarea
          id="category-description"
          name="description"
          maxLength={CATEGORY_DESCRIPTION_MAX_LENGTH}
          defaultValue={fieldDefault(state, "description", stored.description ?? "")}
          {...fieldA11y("category-description-error", errors.description)}
        />
        <FieldError id="category-description-error">{errors.description?.join(" ")}</FieldError>
      </Field>
      <CategoryFormResult state={state} />
      <div>
        <Button type="submit" disabled={pending}>
          {pending ? "Saving…" : category ? "Save changes" : "Create category"}
        </Button>
      </div>
    </form>
  );
}
