"use server";

import {
  createProductInputSchema,
  parseInput,
  productInputSchema,
  productStatusSchema,
} from "@commerceos/core";
import {
  productPath,
  productSavedMessage,
  statusChangedMessage,
} from "@/components/admin/products/product-copy";
import type { ActionState } from "@/lib/action-state";
import { readFormValue, readFormValues } from "./form-data";
import { runAdminAction } from "./run-admin-action";

// Every export of a "use server" file is a public POST endpoint. Each one runs through
// runAdminAction, which calls requireAdmin() before the handler (unit-tested per export).

const PRODUCT_FIELDS = [
  "name",
  "slug",
  "description",
  "price",
  "sku",
  "categoryId",
  "imageUrl",
  "featured",
];
/** Status and stock are set only when a product is created (spec A14). */
const NEW_PRODUCT_FIELDS = [...PRODUCT_FIELDS, "status", "stockQuantity"];

export async function createProduct(
  _previous: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const values = readFormValues(formData, NEW_PRODUCT_FIELDS);
  return runAdminAction("catalog.product.create", values, async ({ createProductUseCase }) => {
    const input = parseInput(createProductInputSchema, values);
    // A derived slug that turns out to be taken is shown in the field, ready to edit.
    values.slug = input.slug;
    const product = await createProductUseCase.execute(input);
    return {
      event: "catalog.product.created",
      id: product.id,
      redirectTo: `${productPath(product.id)}?notice=created`,
    };
  });
}

export async function updateProduct(
  _previous: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const id = readFormValue(formData, "id");
  const values = readFormValues(formData, PRODUCT_FIELDS);
  return runAdminAction("catalog.product.update", values, async ({ updateProductUseCase }) => {
    const input = parseInput(productInputSchema, values);
    values.slug = input.slug;
    const product = await updateProductUseCase.execute({ id, values: input });
    return {
      event: "catalog.product.updated",
      id: product.id,
      message: productSavedMessage(product),
    };
  });
}

export async function setProductStatus(
  _previous: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const id = readFormValue(formData, "id");
  const status = readFormValue(formData, "status");
  return runAdminAction("catalog.product.set_status", {}, async ({ setProductStatusUseCase }) => {
    const product = await setProductStatusUseCase.execute({
      id,
      status: parseInput(productStatusSchema, status),
    });
    return {
      event: "catalog.product.status_changed",
      id: product.id,
      message: statusChangedMessage(product),
    };
  });
}
