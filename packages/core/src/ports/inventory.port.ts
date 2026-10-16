/** One recorded manual stock change (admin catalog spec, Data Model `stock_adjustments`). */
export type StockAdjustmentRecord = {
  id: string;
  productId: string;
  previousQuantity: number;
  newQuantity: number;
  createdAt: Date;
};

/** An absolute stock change, applied only while the stored quantity equals `expectedQuantity`. */
export type SetStockCommand = {
  productId: string;
  expectedQuantity: number;
  newQuantity: number;
};

/**
 * What `setStock` did: updated the product and recorded the change, refused because the stored
 * quantity differs from the expected one (`stale`, nothing written), or found no product.
 */
export type SetStockResult =
  | { kind: "updated"; adjustment: StockAdjustmentRecord }
  | { kind: "stale"; currentQuantity: number }
  | { kind: "not_found" };

/**
 * Stock persistence for the admin, implemented by the database package (spec A5, A6).
 * `setStock` runs the conditional update and the history insert in one transaction, so a
 * change is never applied without its record, and a concurrent change (a checkout decrement,
 * another tab) is never overwritten. A no-op (`expected === new`) is not recorded: the use
 * case answers it without calling `setStock`.
 */
export interface StockRepositoryPort {
  setStock(command: SetStockCommand): Promise<SetStockResult>;
  /** The product's most recent changes, newest first, at most `limit`. */
  listAdjustments(productId: string, limit: number): Promise<StockAdjustmentRecord[]>;
}
