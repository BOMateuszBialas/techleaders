import { PRODUCT_STATUSES, SUPPORTED_CURRENCIES } from "@commerceos/core";
import { defineEntity, p, type InferEntity } from "@mikro-orm/core";
import { CategorySchema } from "../categories/category.entity";

export const ProductSchema = defineEntity({
  name: "Product",
  tableName: "products",
  properties: {
    id: p.uuid().primary().defaultRaw("gen_random_uuid()"),
    category: p.manyToOne(CategorySchema).nullable().deleteRule("set null").index(),
    name: p.string().length(200),
    slug: p.string().length(220).unique(),
    description: p.text().default(""),
    /** Price in integer minor currency units (e.g. grosze). Never a float. */
    priceMinor: p.integer().check("price_minor >= 0"),
    currency: p.enum(SUPPORTED_CURRENCIES).default("PLN"),
    sku: p.string().length(64).nullable().unique(),
    stockQuantity: p.integer().default(0).check("stock_quantity >= 0"),
    imageUrl: p.string().length(2048).nullable(),
    status: p.enum(PRODUCT_STATUSES).default("draft").index(),
    createdAt: p
      .datetime()
      .defaultRaw("now()")
      .onCreate(() => new Date()),
    updatedAt: p
      .datetime()
      .defaultRaw("now()")
      .onCreate(() => new Date())
      .onUpdate(() => new Date()),
  },
});

export type Product = InferEntity<typeof ProductSchema>;
