import { parseInput, type GetTrafficSummaryUseCase, type TrafficSummary } from "@commerceos/core";
import { z } from "zod";
import { toolLimitSchema, toolPeriodSchema } from "./tool-args";

const argsSchema = z.object({ period: toolPeriodSchema, productLimit: toolLimitSchema });

/**
 * Approved tool `getTrafficSummary` (decision D08): sessions by source, the funnel, store
 * conversion and at most 10 most viewed products, from the seeded, fictional demo traffic
 * tables. Its result is always labelled as demo data. Calls the use case unchanged and returns
 * its DTO unchanged.
 */
export class GetTrafficSummaryTool {
  readonly name = "getTrafficSummary";

  constructor(private readonly deps: { getTrafficSummaryUseCase: GetTrafficSummaryUseCase }) {}

  async run(args: unknown): Promise<TrafficSummary> {
    const { period, productLimit } = parseInput(argsSchema, args);
    return this.deps.getTrafficSummaryUseCase.execute({ period, productLimit });
  }
}
