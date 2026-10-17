import { parseInput, type GetOrderSummaryUseCase, type OrderSummary } from "@commerceos/core";
import { z } from "zod";
import { toolPeriodSchema } from "./tool-args";

const argsSchema = z.object({ period: toolPeriodSchema });

/**
 * Approved tool `getOrderSummary`: orders placed in a period, by current status. Calls the E04
 * use case unchanged and returns its DTO unchanged (no customer fields exist in it).
 */
export class GetOrderSummaryTool {
  readonly name = "getOrderSummary";

  constructor(private readonly deps: { getOrderSummaryUseCase: GetOrderSummaryUseCase }) {}

  async run(args: unknown): Promise<OrderSummary> {
    const { period } = parseInput(argsSchema, args);
    return this.deps.getOrderSummaryUseCase.execute({ period });
  }
}
