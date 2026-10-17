import { defineEntity, p, type InferEntity } from "@mikro-orm/core";
import { ProductSchema } from "../products/product.entity";

/**
 * Fictional daily views and add-to-carts per product (orders spec Phase 2, Data Model; D08).
 * Seeded only. A product without rows has "no demo view data", not zero views: products the
 * owner creates in the admin get none. Deleting a product deletes its rows.
 */
export const ProductViewDailyStatSchema = defineEntity({
  name: "ProductViewDailyStat",
  tableName: "product_view_daily_stats",
  properties: {
    id: p.uuid().primary().defaultRaw("gen_random_uuid()"),
    date: p.date(),
    product: p.manyToOne(ProductSchema).deleteRule("cascade").index(),
    views: p.integer().check("views >= 0"),
    addToCarts: p.integer().check("add_to_carts >= 0"),
  },
  checks: [{ name: "product_view_daily_stats_funnel_check", expression: "views >= add_to_carts" }],
  uniques: [
    {
      name: "product_view_daily_stats_date_product_id_unique",
      properties: ["date", "product"],
    },
  ],
});

export type ProductViewDailyStat = InferEntity<typeof ProductViewDailyStatSchema>;
