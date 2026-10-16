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
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { fieldDefault, type ActionState } from "@/lib/action-state";
import { SLUG_CHANGE_WARNING, SLUG_HINT } from "../categories/category-copy";
import { FieldError, FormMessage, fieldA11y } from "../form-feedback";
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
  STOCK_READ_ONLY_HINT,
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
  | "stockQuantity"
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
};

/** New products are priced in PLN (spec A9). */
const NEW_PRODUCT_CURRENCY: CurrencyCode = "PLN";

/** A native select styled like `Input`: it posts without client JavaScript. */
const SELECT_CLASS =
  "h-8 w-full rounded-lg border border-input bg-transparent px-2 text-base outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 aria-invalid:border-destructive md:text-sm dark:bg-input/30";

/**
 * The product form in one given state (spec A15): no hooks, so a unit test renders every
 * state directly. `ProductForm` connects it to `useActionState`. Status and stock are
 * fields only when creating; afterwards stock is read-only (spec A14) and status has its
 * own publish control.
 */
export function ProductFormView({
  action,
  state,
  pending,
  categories,
  product,
}: ProductFormViewProps) {
  const errors = state.fieldErrors ?? {};
  const slugHints = ["product-slug-hint"];
  // G5: a published product's slug is its store URL, and there are no redirects.
  if (product?.status === "published") slugHints.push("product-slug-warning");
  const featured = fieldDefault(state, "featured", product?.featured ? "on" : "") === "on";
  const price = product ? formatPriceInput(product.priceMinor) : "";

  return (
    <form action={action} className="flex max-w-xl flex-col gap-4">
      {product ? <input type="hidden" name="id" value={product.id} /> : null}
      <div className="flex flex-col gap-2">
        <Label htmlFor="product-name">Name</Label>
        <Input
          id="product-name"
          name="name"
          required
          maxLength={PRODUCT_NAME_MAX_LENGTH}
          defaultValue={fieldDefault(state, "name", product?.name)}
          {...fieldA11y("product-name-error", errors.name)}
        />
        <FieldError id="product-name-error" messages={errors.name} />
      </div>
      <div className="flex flex-col gap-2">
        <Label htmlFor="product-slug">Slug</Label>
        <Input
          id="product-slug"
          name="slug"
          defaultValue={fieldDefault(state, "slug", product?.slug)}
          {...fieldA11y("product-slug-error", errors.slug, slugHints)}
        />
        <p id="product-slug-hint" className="text-sm text-muted-foreground">
          {SLUG_HINT}
        </p>
        {slugHints.length > 1 ? (
          <p id="product-slug-warning" className="text-sm text-amber-700 dark:text-amber-400">
            {SLUG_CHANGE_WARNING}
          </p>
        ) : null}
        <FieldError id="product-slug-error" messages={errors.slug} />
      </div>
      <div className="flex flex-col gap-2">
        <Label htmlFor="product-description">Description</Label>
        <Textarea
          id="product-description"
          name="description"
          maxLength={PRODUCT_DESCRIPTION_MAX_LENGTH}
          defaultValue={fieldDefault(state, "description", product?.description)}
          {...fieldA11y("product-description-error", errors.description)}
        />
        <FieldError id="product-description-error" messages={errors.description} />
      </div>
      <div className="flex flex-col gap-2">
        <Label htmlFor="product-price">Price ({product?.currency ?? NEW_PRODUCT_CURRENCY})</Label>
        <Input
          id="product-price"
          name="price"
          required
          inputMode="decimal"
          defaultValue={fieldDefault(state, "price", price)}
          {...fieldA11y("product-price-error", errors.price, ["product-price-hint"])}
        />
        <p id="product-price-hint" className="text-sm text-muted-foreground">
          {PRICE_HINT}
        </p>
        <FieldError id="product-price-error" messages={errors.price} />
      </div>
      <div className="flex flex-col gap-2">
        <Label htmlFor="product-sku">SKU</Label>
        <Input
          id="product-sku"
          name="sku"
          maxLength={PRODUCT_SKU_MAX_LENGTH}
          defaultValue={fieldDefault(state, "sku", product?.sku ?? "")}
          {...fieldA11y("product-sku-error", errors.sku, ["product-sku-hint"])}
        />
        <p id="product-sku-hint" className="text-sm text-muted-foreground">
          {SKU_HINT}
        </p>
        <FieldError id="product-sku-error" messages={errors.sku} />
      </div>
      <div className="flex flex-col gap-2">
        <Label htmlFor="product-category">Category</Label>
        <select
          id="product-category"
          name="categoryId"
          className={SELECT_CLASS}
          defaultValue={fieldDefault(state, "categoryId", product?.categoryId ?? "")}
          {...fieldA11y("product-category-error", errors.categoryId)}
        >
          <option value="">{NO_CATEGORY_LABEL}</option>
          {categories.map((category) => (
            <option key={category.id} value={category.id}>
              {category.name}
            </option>
          ))}
        </select>
        <FieldError id="product-category-error" messages={errors.categoryId} />
      </div>
      <div className="flex flex-col gap-2">
        <Label htmlFor="product-image-url">Image URL</Label>
        <Input
          id="product-image-url"
          name="imageUrl"
          inputMode="url"
          maxLength={PRODUCT_IMAGE_URL_MAX_LENGTH}
          defaultValue={fieldDefault(state, "imageUrl", product?.imageUrl ?? "")}
          {...fieldA11y("product-image-url-error", errors.imageUrl, ["product-image-url-hint"])}
        />
        <p id="product-image-url-hint" className="text-sm text-muted-foreground">
          {IMAGE_URL_HINT}
        </p>
        <FieldError id="product-image-url-error" messages={errors.imageUrl} />
        {product?.imageUrl ? (
          <ImagePreview key={product.imageUrl} url={product.imageUrl} name={product.name} />
        ) : null}
      </div>
      <div className="flex flex-col gap-1">
        <div className="flex items-center gap-2">
          <input
            id="product-featured"
            name="featured"
            type="checkbox"
            value="on"
            defaultChecked={featured}
            aria-describedby="product-featured-hint"
            className="size-4 accent-primary"
          />
          <Label htmlFor="product-featured">{FEATURED_LABEL}</Label>
        </div>
        <p id="product-featured-hint" className="text-sm text-muted-foreground">
          {FEATURED_HINT}
        </p>
      </div>
      {product ? (
        <div className="flex flex-col gap-1">
          <p className="text-sm font-medium">Stock: {product.stockQuantity}</p>
          <p className="text-sm text-muted-foreground">{STOCK_READ_ONLY_HINT}</p>
        </div>
      ) : (
        <>
          <div className="flex flex-col gap-2">
            <Label htmlFor="product-status">Status</Label>
            <select
              id="product-status"
              name="status"
              className={SELECT_CLASS}
              defaultValue={fieldDefault(state, "status", "draft")}
              {...fieldA11y("product-status-error", errors.status)}
            >
              {STATUS_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
            <FieldError id="product-status-error" messages={errors.status} />
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="product-stock">Stock quantity</Label>
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
            <p id="product-stock-hint" className="text-sm text-muted-foreground">
              {INITIAL_STOCK_HINT}
            </p>
            <FieldError id="product-stock-error" messages={errors.stockQuantity} />
          </div>
        </>
      )}
      <FormMessage state={state} />
      <div>
        <Button type="submit" disabled={pending}>
          {pending ? "Saving…" : product ? "Save changes" : "Create product"}
        </Button>
      </div>
    </form>
  );
}
