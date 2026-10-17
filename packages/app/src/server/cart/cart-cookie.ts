import "server-only";
import { CART_LIMITS, type CartLine } from "@commerceos/core";
import { cookies } from "next/headers";
import { z } from "zod";
import { getEnv } from "../env";
import { logger } from "../logger";

/** The cookie that holds the cart (cart spec A2). Its format is protected (`v: 1`). */
export const CART_COOKIE = "commerceos_cart";

/** Renewed on every cart change (spec G10). */
export const CART_COOKIE_MAX_AGE_SECONDS = 30 * 24 * 60 * 60;

/** Larger values are ignored before parsing (spec A2, cross-model review GPT H8). */
const MAX_COOKIE_LENGTH = 4096;

const cookieSchema = z
  .object({
    v: z.literal(1),
    lines: z
      .array(
        z
          .object({
            p: z.uuid(),
            q: z.number().int().min(1).max(CART_LIMITS.maxQuantity),
          })
          .strict(),
      )
      .max(CART_LIMITS.maxLines),
  })
  .strict()
  .refine((cart) => new Set(cart.lines.map((line) => line.p)).size === cart.lines.length);

/** Why a cookie value was ignored, for the log (the value itself is never logged). */
export type CartCookieProblem = "too_large" | "malformed";

export type DecodedCart =
  { ok: true; lines: CartLine[] } | { ok: false; lines: []; problem: CartCookieProblem };

/** `{ v: 1, lines: [{ p, q }] }` as base64url JSON: product ids and quantities, no prices. */
export function encodeCart(lines: readonly CartLine[]): string {
  const value = { v: 1, lines: lines.map((line) => ({ p: line.productId, q: line.quantity })) };
  return Buffer.from(JSON.stringify(value)).toString("base64url");
}

/**
 * Reads a cookie value. Anything oversized, not base64url JSON, of an unknown version or of
 * the wrong shape (a price, a negative quantity, 10,000 lines, a repeated product) is an empty
 * cart; a forged but well-shaped id is priced as "no longer available" later.
 */
export function decodeCart(value: string | undefined): DecodedCart {
  if (value === undefined || value === "") return { ok: true, lines: [] };
  if (value.length > MAX_COOKIE_LENGTH) return { ok: false, lines: [], problem: "too_large" };
  let json: unknown;
  try {
    json = JSON.parse(Buffer.from(value, "base64url").toString("utf8"));
  } catch {
    return { ok: false, lines: [], problem: "malformed" };
  }
  const parsed = cookieSchema.safeParse(json);
  if (!parsed.success) return { ok: false, lines: [], problem: "malformed" };
  return {
    ok: true,
    lines: parsed.data.lines.map((line) => ({ productId: line.p, quantity: line.q })),
  };
}

/** Cookie attributes (spec A2): `Secure` follows the protocol of `APP_URL`. */
export function cartCookieOptions(appUrl: string) {
  return {
    httpOnly: true,
    sameSite: "lax" as const,
    secure: appUrl.startsWith("https:"),
    path: "/",
    maxAge: CART_COOKIE_MAX_AGE_SECONDS,
  };
}

/**
 * The stored cart lines; an invalid cookie is an empty cart and a warning (without the value).
 * The header count, read on every storefront page, passes `logInvalid: false`: the cart and
 * checkout pages and the cart actions still log it, and the next cart action replaces the
 * cookie, so one bad cookie no longer writes a warning per page view (#48).
 */
export async function readCartLines(options: { logInvalid?: boolean } = {}): Promise<CartLine[]> {
  const decoded = decodeCart((await cookies()).get(CART_COOKIE)?.value);
  if (!decoded.ok && options.logInvalid !== false) {
    logger.warn("Cart cookie ignored", { problem: decoded.problem });
  }
  return decoded.lines;
}

/**
 * Stores the cart lines (Server Actions only: a Server Component cannot set cookies). An empty
 * cart deletes the cookie.
 */
export async function writeCartLines(lines: readonly CartLine[]): Promise<void> {
  const store = await cookies();
  if (lines.length === 0) {
    store.delete(CART_COOKIE);
    return;
  }
  store.set(CART_COOKIE, encodeCart(lines), cartCookieOptions(getEnv().APP_URL));
}
