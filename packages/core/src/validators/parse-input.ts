import { z } from "zod";
import { ValidationError, type FieldErrors } from "../errors/app-error";

/** The form-level message when only individual fields are invalid. */
export const INVALID_FIELDS_MESSAGE = "Check the highlighted fields.";

/**
 * Parses untrusted input with a schema. A failure becomes a `ValidationError` whose
 * `fieldErrors` map each field to its messages, so a form can show them under the inputs.
 */
export function parseInput<T>(schema: z.ZodType<T>, input: unknown): T {
  const result = schema.safeParse(input);
  if (result.success) return result.data;

  const { formErrors, fieldErrors } = z.flattenError(result.error);
  const present: FieldErrors = Object.fromEntries(
    Object.entries(fieldErrors).filter(
      (entry): entry is [string, string[]] => entry[1] !== undefined,
    ),
  );
  throw new ValidationError(formErrors[0] ?? INVALID_FIELDS_MESSAGE, present);
}
