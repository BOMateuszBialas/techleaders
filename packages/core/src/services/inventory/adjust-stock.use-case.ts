import { NotFoundError, StaleStockError } from "../../errors/app-error";
import type { ProductRepositoryPort } from "../../ports/catalog.port";
import type { StockRepositoryPort } from "../../ports/inventory.port";
import { isUuid } from "../../validators/common/uuid.schema";
import { setStockSchema, type SetStockRequest } from "../../validators/inventory/set-stock.schema";
import { parseInput } from "../../validators/parse-input";
import {
  PRODUCT_NOT_FOUND_MESSAGE,
  toAdminProduct,
  type AdminProduct,
} from "../products/product.dto";
import { toStockAdjustment, type StockAdjustment } from "./stock-adjustment.dto";

/**
 * The result of a manual stock change: `updated` with its new history row, or `unchanged`
 * when the owner set the quantity already stored (nothing recorded). Either way the product
 * comes back with its store availability, so the admin can say what shoppers now see (D05).
 */
export type AdjustStockResult =
  | { outcome: "updated"; product: AdminProduct; adjustment: StockAdjustment }
  | { outcome: "unchanged"; product: AdminProduct; adjustment: null };

/**
 * Sets a product's stock to an absolute quantity (admin catalog spec A5, API Contracts
 * `adjustStock`). The input is validated first, so a negative, non-integer or too large
 * quantity never reaches the port. The change applies only while the stored quantity still
 * equals the one the form showed; otherwise `StaleStockError` carries the current quantity
 * and nothing is written. A malformed or unknown product id is `NotFoundError`.
 */
export class AdjustStockUseCase {
  constructor(
    private readonly deps: {
      stockRepository: StockRepositoryPort;
      productRepository: ProductRepositoryPort;
    },
  ) {}

  async execute(request: SetStockRequest): Promise<AdjustStockResult> {
    const input = parseInput(setStockSchema, request);
    if (!isUuid(input.productId)) throw new NotFoundError(PRODUCT_NOT_FOUND_MESSAGE);

    if (input.newQuantity === input.expectedQuantity) {
      const product = await this.loadProduct(input.productId);
      if (product.stockQuantity !== input.expectedQuantity) {
        throw new StaleStockError(product.stockQuantity);
      }
      return { outcome: "unchanged", product, adjustment: null };
    }

    const result = await this.deps.stockRepository.setStock(input);
    if (result.kind === "not_found") throw new NotFoundError(PRODUCT_NOT_FOUND_MESSAGE);
    if (result.kind === "stale") throw new StaleStockError(result.currentQuantity);
    return {
      outcome: "updated",
      product: await this.loadProduct(input.productId),
      adjustment: toStockAdjustment(result.adjustment),
    };
  }

  private async loadProduct(id: string): Promise<AdminProduct> {
    const product = await this.deps.productRepository.findById(id);
    if (!product) throw new NotFoundError(PRODUCT_NOT_FOUND_MESSAGE);
    return toAdminProduct(product);
  }
}
