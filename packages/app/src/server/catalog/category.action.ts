"use server";

import { categoryInputSchema, parseInput } from "@commerceos/core";
import {
  CATEGORIES_PATH,
  categoryPath,
  categorySavedMessage,
} from "@/components/admin/categories/category-copy";
import type { ActionState } from "@/lib/action-state";
import { readFormValue, readFormValues } from "./form-data";
import { runAdminAction } from "./run-admin-action";

// Every export of a "use server" file is a public POST endpoint. Each one runs through
// runAdminAction, which calls requireAdmin() before the handler (unit-tested per export).

const CATEGORY_FIELDS = ["name", "slug", "description"];

export async function createCategory(
  _previous: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const values = readFormValues(formData, CATEGORY_FIELDS);
  return runAdminAction("catalog.category.create", values, async ({ createCategoryUseCase }) => {
    const input = parseInput(categoryInputSchema, values);
    // A derived slug that turns out to be taken is shown in the field, ready to edit.
    values.slug = input.slug;
    const category = await createCategoryUseCase.execute(input);
    return {
      event: "catalog.category.created",
      id: category.id,
      redirectTo: `${categoryPath(category.id)}?notice=created`,
    };
  });
}

export async function updateCategory(
  _previous: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const id = readFormValue(formData, "id");
  const values = readFormValues(formData, CATEGORY_FIELDS);
  return runAdminAction("catalog.category.update", values, async ({ updateCategoryUseCase }) => {
    const input = parseInput(categoryInputSchema, values);
    values.slug = input.slug;
    const category = await updateCategoryUseCase.execute({ id, values: input });
    return {
      event: "catalog.category.updated",
      id: category.id,
      message: categorySavedMessage(category),
    };
  });
}

export async function deleteCategory(
  _previous: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const id = readFormValue(formData, "id");
  return runAdminAction("catalog.category.delete", {}, async ({ deleteCategoryUseCase }) => {
    await deleteCategoryUseCase.execute({ id });
    return {
      event: "catalog.category.deleted",
      id,
      redirectTo: `${CATEGORIES_PATH}?notice=deleted`,
    };
  });
}
