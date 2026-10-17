import "server-only";
import { createHash, getRandomValues, randomUUID } from "node:crypto";

/** Cryptographic random bytes for order references (cart spec A8: 100 bits from Web Crypto). */
export function randomBytes(length: number): Uint8Array {
  return getRandomValues(new Uint8Array(length));
}

/** SHA-256 as lowercase hex, for the checkout request fingerprint (spec A7). */
export async function sha256Hex(text: string): Promise<string> {
  return createHash("sha256").update(text).digest("hex");
}

/** A new idempotency key, generated when the checkout page renders (spec A7). */
export function newIdempotencyKey(): string {
  return randomUUID();
}
