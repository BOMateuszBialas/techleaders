import type { StockAdjustmentRecord } from "../../ports/inventory.port";

/** A recorded stock change with its signed delta (derived, not stored: spec Data Model). */
export type StockAdjustment = StockAdjustmentRecord & { delta: number };

/** How many changes the stock panel lists (spec UI/UX "Stock panel"). */
export const STOCK_HISTORY_LIMIT = 20;

export function toStockAdjustment(record: StockAdjustmentRecord): StockAdjustment {
  return { ...record, delta: record.newQuantity - record.previousQuantity };
}
