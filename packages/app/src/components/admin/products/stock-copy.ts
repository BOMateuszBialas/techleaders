import {
  describeStoreAvailability,
  type AdjustStockResult,
  type ProductStatus,
  type StockAdjustment,
} from "@commerceos/core";

/**
 * Owner-facing copy for the stock panel (admin catalog spec, Phase 2, UI/UX "Stock panel").
 * Each message says what the change does in the store (D05), so the wording lives in one
 * tested place.
 */

export const STOCK_HEADING = "Stock";
export const NEW_STOCK_LABEL = "New stock quantity";
export const SET_STOCK_BUTTON = "Set stock";
export const STOCK_HISTORY_HEADING = "Stock history";
export const STOCK_HISTORY_NOTE =
  "Changes since the product was created, newest first (last 20). Initial stock: not recorded.";
export const EMPTY_STOCK_HISTORY = "No stock changes recorded yet.";
/**
 * The hidden quantity the form showed arrived missing or broken (only by editing the page):
 * there is no visible field to highlight, so the panel says this instead (#43).
 */
export const STOCK_FORM_OUTDATED_MESSAGE =
  "This form is out of date. Reload the page and try again.";

/**
 * The availability after a change, stated before the click. It depends on the quantity only
 * for a published product; a draft stays hidden whatever its stock.
 */
export function stockPreview(status: ProductStatus): string {
  return status === "published"
    ? "After the change: 0 shows it to shoppers as out of stock; 1 or more lets them buy it."
    : "It stays hidden from shoppers whatever the quantity, until it is published.";
}

/** Shown after "Set stock": the new quantity and what shoppers now see. */
export function stockChangedMessage(result: AdjustStockResult): string {
  const { product } = result;
  if (result.outcome === "unchanged") {
    return `Stock unchanged at ${product.stockQuantity}. Nothing was recorded.`;
  }
  const sentence = describeStoreAvailability(product.availability);
  return `Stock set to ${product.stockQuantity} (was ${result.adjustment.previousQuantity}). ${sentence}`;
}

/** A signed delta: "+4", "-8". */
export function formatStockDelta(delta: number): string {
  return delta > 0 ? `+${delta}` : String(delta);
}

/**
 * History times are shown in the store's time zone: the demo store sells in PLN, and one
 * owner runs it (spec A6), so a fixed zone keeps every render the same on server and client.
 */
export const STORE_TIME_ZONE = "Europe/Warsaw";
const FALLBACK_LOCALE = "en-GB";

/**
 * The owner's locale from the request's `Accept-Language` header: its first tag the runtime
 * supports, otherwise `en-GB`.
 */
export function ownerLocale(acceptLanguage: string | null): string {
  const tags = (acceptLanguage ?? "")
    .split(",")
    .map((part) => part.replace(/;.*$/, "").trim())
    .filter((tag) => tag !== "" && tag !== "*");
  for (const tag of tags) {
    try {
      const [supported] = Intl.DateTimeFormat.supportedLocalesOf(tag);
      if (supported) return supported;
    } catch {
      // A malformed tag (RangeError) is skipped: the next one, or the fallback, is used.
    }
  }
  return FALLBACK_LOCALE;
}

/** One history row as the panel shows it: plain strings, so the client view stays simple. */
export type StockHistoryRow = {
  id: string;
  /** ISO time for `<time dateTime>`. */
  at: string;
  /** The time in the owner's locale, in `STORE_TIME_ZONE`. */
  atLabel: string;
  change: string;
  delta: string;
};

export function toStockHistoryRows(history: StockAdjustment[], locale: string): StockHistoryRow[] {
  const format = new Intl.DateTimeFormat(locale, {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: STORE_TIME_ZONE,
  });
  return history.map((entry) => ({
    id: entry.id,
    at: entry.createdAt.toISOString(),
    atLabel: format.format(entry.createdAt),
    change: `${entry.previousQuantity} → ${entry.newQuantity}`,
    delta: formatStockDelta(entry.delta),
  }));
}
