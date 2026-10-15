import { z } from "zod";

/** A record id as the database generates it (`gen_random_uuid()`). */
export const uuidSchema = z.uuid();

/** True for a well-formed id. Use cases check it before querying, so a bad URL is "not found". */
export function isUuid(value: unknown): value is string {
  return uuidSchema.safeParse(value).success;
}
