import { parseInput, type GetTopProductsUseCase, type TopProducts } from "@commerceos/core";
import { z } from "zod";
import { toolLimitSchema, toolPeriodSchema } from "./tool-args";

const argsSchema = z.object({ period: toolPeriodSchema, limit: toolLimitSchema });

/**
 * Approved tool `getTopProducts`: the best sellers of a period in paid orders, at most 10.
 * Calls the E04 use case unchanged and returns its DTO unchanged.
 */
export class GetTopProductsTool {
  readonly name = "getTopProducts";

  constructor(private readonly deps: { getTopProductsUseCase: GetTopProductsUseCase }) {}

  async run(args: unknown): Promise<TopProducts> {
    const { period, limit } = parseInput(argsSchema, args);
    return this.deps.getTopProductsUseCase.execute({ period, limit });
  }
}
