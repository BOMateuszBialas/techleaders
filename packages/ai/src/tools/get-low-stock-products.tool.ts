import {
  parseInput,
  type GetLowStockProductsUseCase,
  type LowStockProducts,
} from "@commerceos/core";
import { z } from "zod";
import { toolLimitSchema, toolThresholdSchema } from "./tool-args";

const argsSchema = z.object({ threshold: toolThresholdSchema, limit: toolLimitSchema });

/**
 * Approved tool `getLowStockProducts`: published products at or below a stock threshold now,
 * at most 10 rows plus the total. Calls the E04 use case unchanged and returns its DTO unchanged.
 */
export class GetLowStockProductsTool {
  readonly name = "getLowStockProducts";

  constructor(private readonly deps: { getLowStockProductsUseCase: GetLowStockProductsUseCase }) {}

  async run(args: unknown): Promise<LowStockProducts> {
    const { threshold, limit } = parseInput(argsSchema, args);
    return this.deps.getLowStockProductsUseCase.execute({ threshold, limit });
  }
}
