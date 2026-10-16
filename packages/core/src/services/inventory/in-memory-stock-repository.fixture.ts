import type {
  SetStockCommand,
  SetStockResult,
  StockAdjustmentRecord,
  StockRepositoryPort,
} from "../../ports/inventory.port";
import type { InMemoryProductRepository } from "../products/in-memory-product-repository.fixture";

/**
 * A `StockRepositoryPort` fake for unit tests. It writes the stock of the products held by an
 * `InMemoryProductRepository`, so both fakes see the same data, and mirrors the database: the
 * update applies only when the stored quantity equals the expected one, and each applied
 * change is recorded, newest first.
 */
export class InMemoryStockRepository implements StockRepositoryPort {
  readonly adjustments: StockAdjustmentRecord[] = [];
  private nextId = 1;

  constructor(
    private readonly productRepository: InMemoryProductRepository,
    private readonly now: () => Date = () => new Date("2026-10-16T09:30:00.000Z"),
  ) {}

  async setStock(command: SetStockCommand): Promise<SetStockResult> {
    const product = this.productRepository.products.get(command.productId);
    if (!product) return { kind: "not_found" };
    if (product.stockQuantity !== command.expectedQuantity) {
      return { kind: "stale", currentQuantity: product.stockQuantity };
    }
    this.productRepository.products.set(product.id, {
      ...product,
      stockQuantity: command.newQuantity,
    });
    const adjustment: StockAdjustmentRecord = {
      id: `5b3e4c74-8f2a-4cad-9c73-${String(this.nextId++).padStart(12, "0")}`,
      productId: product.id,
      previousQuantity: command.expectedQuantity,
      newQuantity: command.newQuantity,
      createdAt: this.now(),
    };
    this.adjustments.unshift(adjustment);
    return { kind: "updated", adjustment };
  }

  async listAdjustments(productId: string, limit: number): Promise<StockAdjustmentRecord[]> {
    return this.adjustments.filter((entry) => entry.productId === productId).slice(0, limit);
  }
}
