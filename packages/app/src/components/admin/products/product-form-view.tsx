import {
  formatPriceInput,
  MAX_STOCK_QUANTITY,
  PRODUCT_DESCRIPTION_MAX_LENGTH,
  PRODUCT_IMAGE_URL_MAX_LENGTH,
  PRODUCT_NAME_MAX_LENGTH,
  PRODUCT_SKU_MAX_LENGTH,
  type AdminProduct,
  type CurrencyCode,
} from "@commerceos/core";
import type { ReactNode } from "react";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Field,
  FieldContent,
  FieldDescription,
  FieldError,
  FieldLabel,
} from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { NativeSelect } from "@/components/ui/native-select";
import { Textarea } from "@/components/ui/textarea";
import { fieldDefault, type ActionState } from "@/lib/action-state";
import { fieldA11y } from "@/lib/field-a11y";
import { SLUG_CHANGE_WARNING, SLUG_HINT } from "../categories/category-copy";
import { ImagePreview } from "./image-preview";
import {
  FEATURED_HINT,
  FEATURED_LABEL,
  IMAGE_URL_HINT,
  INITIAL_STOCK_HINT,
  NO_CATEGORY_LABEL,
  PRICE_HINT,
  SKU_HINT,
  STATUS_OPTIONS,
} from "./product-copy";

/** The stored product an edit form starts from. */
export type ProductFormProduct = Pick<
  AdminProduct,
  | "id"
  | "name"
  | "slug"
  | "description"
  | "priceMinor"
  | "currency"
  | "sku"
  | "imageUrl"
  | "status"
  | "featured"
> & { categoryId: string | null };

export type ProductCategoryOption = { id: string; name: string };

export type ProductFormViewProps = {
  action: (formData: FormData) => void;
  state: ActionState;
  pending: boolean;
  categories: ProductCategoryOption[];
  /** Absent on the "new product" page. */
  product?: ProductFormProduct;
  /** Rendered under the Description field: the "Draft with AI" panel (descriptions spec). */
  descriptionDraft?: ReactNode;
};

/** The form id; the wrapper finds the first invalid field inside it (A-2). */
export const PRODUCT_FORM_ID = "product-form";

/** New products are priced in PLN (spec A9). */
const NEW_PRODUCT_CURRENCY: CurrencyCode = "PLN";

/**
 * The form-level result (spec UI/UX "States"): `destructive` with `role="alert"` for an error,
 * `success` with `role="status"` for a saved change. Nothing before the first submit.
 */
function FormResult({ state }: { state: ActionState }) {
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
 * The product form in one given state (spec A15): no hooks, so a unit test renders every
 * state directly. `ProductForm` connects it to `useActionState`. Status and stock are
 * fields only when creating; afterwards status has its own publish control and stock its own
 * recorded stock panel (spec A14).
 */
export function ProductFormView({
  action,
  state,
  pending,
  categories,
  product,
  descriptionDraft,
}: ProductFormViewProps) {
  const errors = state.fieldErrors ?? {};
  const slugHints = ["product-slug-hint"];
  // G5: a published product's slug is its store URL, and there are no redirects.
  if (product?.status === "published") slugHints.push("product-slug-warning");
  const featured = fieldDefault(state, "featured", product?.featured ? "on" : "") === "on";
  const price = product ? formatPriceInput(product.priceMinor) : "";

  return (
    <form id={PRODUCT_FORM_ID} action={action} className="flex max-w-xl flex-col gap-4">
      {product ? <input type="hidden" name="id" value={product.id} /> : null}
      <Field>
        <FieldLabel htmlFor="product-name">Name</FieldLabel>
        <Input
          id="product-name"
          name="name"
          required
          maxLength={PRODUCT_NAME_MAX_LENGTH}
          defaultValue={fieldDefault(state, "name", product?.name)}
          {...fieldA11y("product-name-error", errors.name)}
        />
        <FieldError id="product-name-error">{errors.name?.join(" ")}</FieldError>
      </Field>
      <Field>
        <FieldLabel htmlFor="product-slug">Slug</FieldLabel>
        <Input
          id="product-slug"
          name="slug"
          defaultValue={fieldDefault(state, "slug", product?.slug)}
          {...fieldA11y("product-slug-error", errors.slug, slugHints)}
        />
        <FieldDescription id="product-slug-hint">{SLUG_HINT}</FieldDescription>
        {slugHints.length > 1 ? (
          <Alert id="product-slug-warning" variant="warning">
            {SLUG_CHANGE_WARNING}
          </Alert>
        ) : null}
        <FieldError id="product-slug-error">{errors.slug?.join(" ")}</FieldError>
      </Field>
      <Field>
        <FieldLabel htmlFor="product-description">Description</FieldLabel>
        <Textarea
          id="product-description"
          name="description"
          maxLength={PRODUCT_DESCRIPTION_MAX_LENGTH}
          defaultValue={fieldDefault(state, "description", product?.description)}
          {...fieldA11y("product-description-error", errors.description)}
        />
        <FieldError id="product-description-error">{errors.description?.join(" ")}</FieldError>
        {descriptionDraft}
      </Field>
      <Field>
        <FieldLabel htmlFor="product-price">
          Price ({product?.currency ?? NEW_PRODUCT_CURRENCY})
        </FieldLabel>
        <Input
          id="product-price"
          name="price"
          required
          inputMode="decimal"
          defaultValue={fieldDefault(state, "price", price)}
          {...fieldA11y("product-price-error", errors.price, ["product-price-hint"])}
        />
        <FieldDescription id="product-price-hint">{PRICE_HINT}</FieldDescription>
        <FieldError id="product-price-error">{errors.price?.join(" ")}</FieldError>
      </Field>
      <Field>
        <FieldLabel htmlFor="product-sku">SKU</FieldLabel>
        <Input
          id="product-sku"
          name="sku"
          maxLength={PRODUCT_SKU_MAX_LENGTH}
          defaultValue={fieldDefault(state, "sku", product?.sku ?? "")}
          {...fieldA11y("product-sku-error", errors.sku, ["product-sku-hint"])}
        />
        <FieldDescription id="product-sku-hint">{SKU_HINT}</FieldDescription>
        <FieldError id="product-sku-error">{errors.sku?.join(" ")}</FieldError>
      </Field>
      <Field>
        <FieldLabel htmlFor="product-category">Category</FieldLabel>
        <NativeSelect
          id="product-category"
          name="categoryId"
          defaultValue={fieldDefault(state, "categoryId", product?.categoryId ?? "")}
          {...fieldA11y("product-category-error", errors.categoryId)}
        >
          <option value="">{NO_CATEGORY_LABEL}</option>
          {categories.map((category) => (
            <option key={category.id} value={category.id}>
              {category.name}
            </option>
          ))}
        </NativeSelect>
        <FieldError id="product-category-error">{errors.categoryId?.join(" ")}</FieldError>
      </Field>
      <Field>
        <FieldLabel htmlFor="product-image-url">Image URL</FieldLabel>
        <Input
          id="product-image-url"
          name="imageUrl"
          inputMode="url"
          maxLength={PRODUCT_IMAGE_URL_MAX_LENGTH}
          defaultValue={fieldDefault(state, "imageUrl", product?.imageUrl ?? "")}
          {...fieldA11y("product-image-url-error", errors.imageUrl, ["product-image-url-hint"])}
        />
        <FieldDescription id="product-image-url-hint">{IMAGE_URL_HINT}</FieldDescription>
        <FieldError id="product-image-url-error">{errors.imageUrl?.join(" ")}</FieldError>
        {product?.imageUrl ? (
          <ImagePreview key={product.imageUrl} url={product.imageUrl} name={product.name} />
        ) : null}
      </Field>
      <Field orientation="horizontal">
        <Checkbox
          id="product-featured"
          name="featured"
          value="on"
          defaultChecked={featured}
          {...fieldA11y("product-featured-error", errors.featured, ["product-featured-hint"])}
        />
        <FieldContent>
          <FieldLabel htmlFor="product-featured">{FEATURED_LABEL}</FieldLabel>
          <FieldDescription id="product-featured-hint">{FEATURED_HINT}</FieldDescription>
          <FieldError id="product-featured-error">{errors.featured?.join(" ")}</FieldError>
        </FieldContent>
      </Field>
      {product ? null : (
        <>
          <Field>
            <FieldLabel htmlFor="product-status">Status</FieldLabel>
            <NativeSelect
              id="product-status"
              name="status"
              defaultValue={fieldDefault(state, "status", "draft")}
              {...fieldA11y("product-status-error", errors.status)}
            >
              {STATUS_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </NativeSelect>
            <FieldError id="product-status-error">{errors.status?.join(" ")}</FieldError>
          </Field>
          <Field>
            <FieldLabel htmlFor="product-stock">Stock quantity</FieldLabel>
            <Input
              id="product-stock"
              name="stockQuantity"
              type="number"
              required
              min={0}
              max={MAX_STOCK_QUANTITY}
              step={1}
              defaultValue={fieldDefault(state, "stockQuantity", "0")}
              {...fieldA11y("product-stock-error", errors.stockQuantity, ["product-stock-hint"])}
            />
            <FieldDescription id="product-stock-hint">{INITIAL_STOCK_HINT}</FieldDescription>
            <FieldError id="product-stock-error">{errors.stockQuantity?.join(" ")}</FieldError>
          </Field>
        </>
      )}
      <FormResult state={state} />
      <div>
        <Button type="submit" disabled={pending} aria-busy={pending}>
          {pending ? "Saving…" : product ? "Save changes" : "Create product"}
        </Button>
      </div>
    </form>
  );
}
