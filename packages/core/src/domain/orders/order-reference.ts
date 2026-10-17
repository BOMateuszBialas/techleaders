/**
 * Public order references (cart spec A8): `CO-` and 20 Crockford base32 characters (100 bits
 * from a cryptographic source), stored and shown grouped by five, e.g.
 * `CO-7K3MQ-9XZ2A-H4TPC-W8R1N`. The reference is a bearer secret: it is never logged.
 */
const CROCKFORD = "0123456789ABCDEFGHJKMNPQRSTVWXYZ";
const BODY_LENGTH = 20;
const BODY = /^[0-9A-HJKMNP-TV-Z]{20}$/;

/** Random bytes from a cryptographic source; the app passes Web Crypto, tests a fixed function. */
export type RandomBytes = (length: number) => Uint8Array;

function group(body: string): string {
  const groups = [0, 5, 10, 15].map((start) => body.slice(start, start + 5));
  return `CO-${groups.join("-")}`;
}

/** A new reference. Each byte maps to one character (256 is a multiple of 32: no bias). */
export function generateOrderReference(randomBytes: RandomBytes): string {
  const bytes = randomBytes(BODY_LENGTH);
  if (bytes.length !== BODY_LENGTH) throw new Error("randomBytes returned the wrong length");
  return group(Array.from(bytes, (byte) => CROCKFORD[byte % 32]).join(""));
}

/**
 * The stored form of what a shopper typed or a URL carried: upper-cased, spaces and dashes
 * removed, the `CO` prefix required, then regrouped. `null` for anything that is not a
 * reference, so a malformed one is "not found" without a query.
 */
export function normalizeOrderReference(input: string): string | null {
  const compact = input.toUpperCase().replace(/[\s-]/g, "");
  if (!compact.startsWith("CO")) return null;
  const body = compact.slice(2);
  return BODY.test(body) ? group(body) : null;
}

export function isOrderReference(input: string): boolean {
  return normalizeOrderReference(input) === input;
}
