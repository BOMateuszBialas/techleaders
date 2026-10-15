import "server-only";
import type { FormValues } from "@/lib/action-state";

/**
 * Copies the listed fields out of `FormData` as strings (a missing field or a file becomes "").
 * Only these fields reach the core schemas: FormData is never spread into a write.
 */
export function readFormValues(formData: FormData, fields: readonly string[]): FormValues {
  return Object.fromEntries(fields.map((field) => [field, readFormValue(formData, field)]));
}

/** One field as a string ("" when missing or a file), e.g. a record id from a hidden input. */
export function readFormValue(formData: FormData, field: string): string {
  const value = formData.get(field);
  return typeof value === "string" ? value : "";
}
