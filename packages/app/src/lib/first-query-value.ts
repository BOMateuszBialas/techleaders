/**
 * The first value of a query parameter (`?page=2&page=3` → "2"). Admin list loaders pass it to
 * their use case, which turns anything that is not a page number into page 1 (`parseListPage`).
 */
export function firstQueryValue(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}
