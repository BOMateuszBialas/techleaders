import { defineEntity, p, type InferEntity } from "@mikro-orm/core";
import { ProductSchema } from "../products/product.entity";
import { OrderSchema } from "./order.entity";

/**
 * One order line (cart spec, Data Model): the product's name, SKU and unit price are
 * snapshots taken at placement, so a later price change or a deleted product never rewrites
 * an order. `product_id` is set to null when the product is deleted (history survives).
 */
export const OrderItemSchema = defineEntity({
  name: "OrderItem",
  tableName: "order_items",
  properties: {
    id: p.uuid().primary().defaultRaw("gen_random_uuid()"),
    order: p.manyToOne(OrderSchema).deleteRule("cascade").index(),
    product: p.manyToOne(ProductSchema).nullable().deleteRule("set null").index(),
    productName: p.string().length(200),
    productSku: p.string().length(64).nullable(),
    unitPriceMinor: p.integer().check("unit_price_minor >= 0"),
    quantity: p.integer().check("quantity between 1 and 99"),
    lineTotalMinor: p.integer().check("line_total_minor = unit_price_minor * quantity"),
  },
  uniques: [{ name: "order_items_order_id_product_id_unique", properties: ["order", "product"] }],
});

export type OrderItem = InferEntity<typeof OrderItemSchema>;
