import { NotFoundError } from "../../errors/app-error";
import type { StockRepositoryPort } from "../../ports/inventory.port";
import { isUuid } from "../../validators/common/uuid.schema";
import { PRODUCT_NOT_FOUND_MESSAGE } from "../products/product.dto";
import {
  STOCK_HISTORY_LIMIT,
  toStockAdjustment,
  type StockAdjustment,
} from "./stock-adjustment.dto";

/**
 * A product's stock history for the stock panel: the last `STOCK_HISTORY_LIMIT` changes,
 * newest first, each with its signed delta. The initial stock of a new product is not a
 * change and is not listed (spec Data Model). A malformed id is `NotFoundError`.
 */
export class ListStockAdjustmentsUseCase {
  constructor(private readonly deps: { stockRepository: StockRepositoryPort }) {}

  async execute(input: { productId: string }): Promise<StockAdjustment[]> {
    if (!isUuid(input.productId)) throw new NotFoundError(PRODUCT_NOT_FOUND_MESSAGE);
    const records = await this.deps.stockRepository.listAdjustments(
      input.productId,
      STOCK_HISTORY_LIMIT,
    );
    return records.map(toStockAdjustment);
  }
}
