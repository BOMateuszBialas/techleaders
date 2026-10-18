import { z } from "zod";

/**
 * The `?page=` of an admin list (orders, Copilot recommendations): a whole number from 1;
 * anything else (missing, `-1`, `abc`, `1.5`) falls back to page 1, never an error page
 * (orders spec Edge Cases).
 */
export const listPageSchema = z.coerce.number().int().min(1).max(1_000_000).catch(1);

export function parseListPage(value: unknown): number {
  return listPageSchema.parse(value);
}
