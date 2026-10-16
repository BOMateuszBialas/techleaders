import type {
  SetStockCommand,
  SetStockResult,
  StockAdjustmentRecord,
  StockRepositoryPort,
} from "@commerceos/core";
import type { EntityManager, QueryResult } from "@mikro-orm/postgresql";
import {
  StockAdjustmentSchema,
  type StockAdjustment,
} from "../entities/inventory/stock-adjustment.entity";
import { toStockWriteError } from "./catalog-write-error";

function toRecord(adjustment: StockAdjustment): StockAdjustmentRecord {
  return {
    id: adjustment.id,
    productId: adjustment.product.id,
    previousQuantity: adjustment.previousQuantity,
    newQuantity: adjustment.newQuantity,
    createdAt: adjustment.createdAt,
  };
}

/**
 * Database adapter for the core `StockRepositoryPort` (admin catalog spec, Phase 2).
 * Request-scoped: it works on the request's EntityManager fork.
 *
 * `setStock` is one transaction: a native conditional update (`… where id = ? and
 * stock_quantity = :expected`, which also sets `updated_at`, because a native update skips
 * the entity's `onUpdate`), then the history insert. Under READ COMMITTED a concurrent change
 * to the same row waits for this one's lock and then no longer matches the expected value, so
 * two sets from the same page give one `updated` and one `stale`. A failed insert rolls the
 * update back: a change is never applied without its record.
 */
export class DatabaseStockRepository implements StockRepositoryPort {
  constructor(private readonly deps: { em: EntityManager }) {}

  async setStock(command: SetStockCommand): Promise<SetStockResult> {
    try {
      return await this.deps.em.transactional((em) => this.setStockIn(em, command));
    } catch (error) {
      throw toStockWriteError(error);
    }
  }

  async listAdjustments(productId: string, limit: number): Promise<StockAdjustmentRecord[]> {
    const adjustments = await this.deps.em.find(
      StockAdjustmentSchema,
      { product: productId },
      { orderBy: { createdAt: "desc", id: "desc" }, limit },
    );
    return adjustments.map(toRecord);
  }

  private async setStockIn(em: EntityManager, command: SetStockCommand): Promise<SetStockResult> {
    const { productId, expectedQuantity, newQuantity } = command;
    const updated = await em.execute<QueryResult>(
      "update products set stock_quantity = ?, updated_at = now() where id = ? and stock_quantity = ?",
      [newQuantity, productId, expectedQuantity],
      "run",
    );
    if (updated.affectedRows === 0) {
      // Nothing matched: tell a changed quantity (stale) from a missing product.
      const rows = await em.execute<{ stock_quantity: number }[]>(
        "select stock_quantity from products where id = ?",
        [productId],
      );
      const current = rows[0];
      return current
        ? { kind: "stale", currentQuantity: current.stock_quantity }
        : { kind: "not_found" };
    }

    const adjustment = em.create(StockAdjustmentSchema, {
      product: productId,
      previousQuantity: expectedQuantity,
      newQuantity,
    });
    await em.flush();
    return { kind: "updated", adjustment: toRecord(adjustment) };
  }
}
