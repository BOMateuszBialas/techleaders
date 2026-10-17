import { parseInput, type GetSalesSummaryUseCase, type SalesSummary } from "@commerceos/core";
import { z } from "zod";
import { toolPeriodSchema } from "./tool-args";

const argsSchema = z.object({ period: toolPeriodSchema });

/**
 * Approved tool `getSalesSummary`: paid orders, revenue and AOV in the store currency for a
 * period. Calls the E04 use case unchanged and returns its DTO unchanged.
 */
export class GetSalesSummaryTool {
  readonly name = "getSalesSummary";

  constructor(private readonly deps: { getSalesSummaryUseCase: GetSalesSummaryUseCase }) {}

  async run(args: unknown): Promise<SalesSummary> {
    const { period } = parseInput(argsSchema, args);
    return this.deps.getSalesSummaryUseCase.execute({ period });
  }
}
