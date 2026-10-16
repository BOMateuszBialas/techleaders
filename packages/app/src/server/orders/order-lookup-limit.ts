import "server-only";
import type { RateLimiterPort } from "@commerceos/core";
import type { Env } from "../env";

/** Per client IP when a trusted proxy header names it (cart spec A15). */
export const LOOKUP_LIMIT_PER_IP = 30;
/** Shared by every client otherwise: never keyed on a header a client could forge. */
export const LOOKUP_LIMIT_SHARED = 120;
export const LOOKUP_WINDOW_SECONDS = 60;

export const TOO_MANY_LOOKUPS_MESSAGE = "Too many lookups. Try again in a minute.";

/**
 * The limiter bucket for this request, chosen exactly like the admin sign-in limit: the client
 * IP only from `AUTH_TRUSTED_IP_HEADER` (set behind a proxy that overwrites it), otherwise one
 * shared bucket. `x-forwarded-for` and friends are never read on their own.
 */
export function orderLookupBucket(
  env: Pick<Env, "AUTH_TRUSTED_IP_HEADER">,
  headers: Pick<Headers, "get">,
): { key: string; limit: number } {
  const header = env.AUTH_TRUSTED_IP_HEADER;
  const raw = header ? (headers.get(header) ?? "") : "";
  // A proxy may append: the first entry is the client.
  const comma = raw.indexOf(",");
  const ip = (comma === -1 ? raw : raw.slice(0, comma)).trim();
  return ip !== ""
    ? { key: `order-lookup|${ip}`, limit: LOOKUP_LIMIT_PER_IP }
    : { key: "order-lookup|shared", limit: LOOKUP_LIMIT_SHARED };
}

/** Counts one read of an order by reference; false once the bucket is over its limit. */
export async function consumeOrderLookup(
  rateLimiter: RateLimiterPort,
  env: Pick<Env, "AUTH_TRUSTED_IP_HEADER">,
  headers: Pick<Headers, "get">,
): Promise<boolean> {
  const { key, limit } = orderLookupBucket(env, headers);
  return (await rateLimiter.consume(key, limit, LOOKUP_WINDOW_SECONDS)).allowed;
}
