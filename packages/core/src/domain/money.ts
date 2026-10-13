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

export class InvalidMoneyError extends Error {
  override readonly name = "InvalidMoneyError";
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
