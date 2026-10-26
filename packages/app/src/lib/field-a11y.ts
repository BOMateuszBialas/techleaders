/**
 * Accessibility attributes for an input: `aria-invalid` when it has errors, and
 * `aria-describedby` pointing at its hints and its error message. Shared by the storefront and
 * the admin forms (retrofit lesson 08, Phase 1: moved from `components/admin/form-feedback.tsx`
 * so the storefront does not import admin UI).
 */
export function fieldA11y(
  errorId: string,
  messages: string[] | undefined,
  hintIds: string[] = [],
): { "aria-invalid": boolean; "aria-describedby": string | undefined } {
  const invalid = messages !== undefined && messages.length > 0;
  const describedBy = [...hintIds, ...(invalid ? [errorId] : [])];
  return {
    "aria-invalid": invalid,
    "aria-describedby": describedBy.length > 0 ? describedBy.join(" ") : undefined,
  };
}
