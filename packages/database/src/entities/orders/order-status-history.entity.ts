import { defineEntity, p, type InferEntity } from "@mikro-orm/core";
import { OrderSchema } from "./order.entity";

/**
 * One status change of an order (orders spec, Phase 1, audit trail; supersedes A6). Written in the
 * same transaction as the change, so a rolled-back change leaves no row. `changed_by` is the
 * admin's id from the session (null only if the actor is unknown); the order's own history
 * is deleted with the order.
 */
export const OrderStatusHistorySchema = defineEntity({
  name: "OrderStatusHistory",
  tableName: "order_status_history",
  properties: {
    id: p.uuid().primary().defaultRaw("gen_random_uuid()"),
    order: p.manyToOne(OrderSchema).deleteRule("cascade"),
    fromStatus: p.string().length(32),
    toStatus: p.string().length(32),
    changedBy: p.string().length(128).nullable(),
    changedAt: p
      .datetime()
      .defaultRaw("now()")
      .onCreate(() => new Date()),
  },
  indexes: [
    {
      name: "order_status_history_order_id_changed_at_index",
      properties: ["order", "changedAt"],
      columns: [{ name: "order_id" }, { name: "changed_at", sort: "desc" }],
    },
  ],
});

export type OrderStatusHistory = InferEntity<typeof OrderStatusHistorySchema>;
