import { defineEntity, p, type InferEntity } from "@mikro-orm/core";
import { ProductSchema } from "../products/product.entity";

/**
 * One manual stock change (admin catalog spec, Phase 2, Data Model): the product, the
 * quantity before and after, and when. No reason, actor or source column (spec A6, G3); the
 * delta is derived. The initial stock of a new product is not recorded. The checks and the
 * history index are declared here, not only in the migration, so the drift test sees them.
 */
export const StockAdjustmentSchema = defineEntity({
  name: "StockAdjustment",
  tableName: "stock_adjustments",
  properties: {
    id: p.uuid().primary().defaultRaw("gen_random_uuid()"),
    product: p.manyToOne(ProductSchema).deleteRule("cascade"),
    previousQuantity: p.integer().check("previous_quantity >= 0"),
    newQuantity: p.integer().check("new_quantity >= 0"),
    createdAt: p
      .datetime()
      .defaultRaw("now()")
      .onCreate(() => new Date()),
  },
  checks: [
    // A no-op is not a change: the use case answers "unchanged" without writing.
    {
      name: "stock_adjustments_quantity_changed_check",
      expression: "new_quantity <> previous_quantity",
    },
  ],
  indexes: [
    {
      name: "stock_adjustments_product_id_created_at_index",
      properties: ["product", "createdAt"],
      columns: [{ name: "product_id" }, { name: "created_at", sort: "desc" }],
    },
  ],
});

export type StockAdjustment = InferEntity<typeof StockAdjustmentSchema>;
