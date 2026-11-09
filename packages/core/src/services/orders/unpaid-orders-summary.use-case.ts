import type { Clock } from "../../domain/metrics/metric-period";
import type { OrderAdminPort, UnpaidOrdersSummary } from "../../ports/order-admin.port";

/** An unpaid order older than this is "stale": the owner may cancel it by hand (restock is automatic). */
export const UNPAID_STALE_AFTER_HOURS = 24;

const HOUR_MS = 60 * 60 * 1000;

/**
 * The dashboard card for unpaid orders (unpaid-orders visibility): how many `pending_payment`
 * orders hold stock, how many of them are older than `UNPAID_STALE_AFTER_HOURS`, and the oldest.
 * There is no background job; the owner acts on this by hand.
 */
export class UnpaidOrdersSummaryUseCase {
  constructor(private readonly deps: { orderAdminRepository: OrderAdminPort; clock: Clock }) {}

  async execute(): Promise<UnpaidOrdersSummary> {
    const staleBefore = new Date(this.deps.clock().getTime() - UNPAID_STALE_AFTER_HOURS * HOUR_MS);
    return this.deps.orderAdminRepository.summarizeUnpaid(staleBefore);
  }
}
