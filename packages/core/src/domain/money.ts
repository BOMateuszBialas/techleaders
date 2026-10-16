import { AppError } from "../errors/app-error";

/**
 * Money is always stored and calculated as integer minor currency units
 * (e.g. grosze, cents). Never use floating-point amounts for prices or totals.
 */

export const SUPPORTED_CURRENCIES = ["PLN", "EUR", "USD"] as const;
export type CurrencyCode = (typeof SUPPORTED_CURRENCIES)[number];

export type Money = {
  readonly amountMinor: number;
  readonly currency: CurrencyCode;
};

/** A money invariant was broken (non-integer amount, currency mismatch). Internal, not user input. */
export class InvalidMoneyError extends AppError {
  constructor(message: string) {
    super("INVALID_MONEY", message);
  }
}

export function isCurrencyCode(value: string): value is CurrencyCode {
  return (SUPPORTED_CURRENCIES as readonly string[]).includes(value);
}

export function money(amountMinor: number, currency: CurrencyCode): Money {
  if (!Number.isSafeInteger(amountMinor)) {
    throw new InvalidMoneyError(`Amount must be a safe integer in minor units, got ${amountMinor}`);
  }
  return { amountMinor, currency };
}

function assertSameCurrency(a: Money, b: Money): void {
  if (a.currency !== b.currency) {
    throw new InvalidMoneyError(`Currency mismatch: ${a.currency} vs ${b.currency}`);
  }
}

export function addMoney(a: Money, b: Money): Money {
  assertSameCurrency(a, b);
  return money(a.amountMinor + b.amountMinor, a.currency);
}

export function multiplyMoney(value: Money, quantity: number): Money {
  if (!Number.isSafeInteger(quantity) || quantity < 0) {
    throw new InvalidMoneyError(`Quantity must be a non-negative integer, got ${quantity}`);
  }
  return money(value.amountMinor * quantity, value.currency);
}

export function sumMoney(values: readonly Money[], currency: CurrencyCode): Money {
  return values.reduce<Money>((total, value) => addMoney(total, value), money(0, currency));
}

/** Formats money for display. Presentation-only; never parse the result back. */
export function formatMoney(value: Money, locale = "pl-PL"): string {
  return new Intl.NumberFormat(locale, { style: "currency", currency: value.currency }).format(
    value.amountMinor / 100,
  );
}

/** The largest price the `int` column `products.price_minor` holds. */
export const MAX_PRICE_MINOR = 2_147_483_647;

/** Digits, then optionally a dot or comma and one or two decimals: "249", "249.9", "249,90". */
const PRICE_INPUT_PATTERN = /^(\d{1,10})(?:[.,](\d{1,2}))?$/;

/**
 * Parses the price the owner typed ("249.90" or "249,90") into minor units (24990) by string
 * parsing, never float maths (spec A8, G4). Returns `null` for anything else: more than two
 * decimals, a sign, an exponent, thousands separators, or more than `MAX_PRICE_MINOR`.
 */
export function parsePriceInput(text: string): number | null {
  const match = PRICE_INPUT_PATTERN.exec(text.trim());
  if (!match) return null;
  const [, units = "", decimals = ""] = match;
  const minor = Number(units) * 100 + Number(decimals.padEnd(2, "0"));
  return minor <= MAX_PRICE_MINOR ? minor : null;
}

/** The inverse of `parsePriceInput`, used to prefill the price input: 24990 → "249.90". */
export function formatPriceInput(amountMinor: number): string {
  const units = Math.floor(amountMinor / 100);
  return `${units}.${String(amountMinor % 100).padStart(2, "0")}`;
}
