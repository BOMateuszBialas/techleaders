import { PRODUCT_STATUSES, SUPPORTED_CURRENCIES, type TechnicalSpec } from "@commerceos/core";
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
    /**
     * Technical data rows `{ label, value }` (storefront v2 spec, Phase 3, Q10). The database
     * checks only the type; the shape (at most 12 rows, label and value lengths) is the core
     * schema `technicalSpecsSchema`. Set by the seeder for the products it creates only.
     */
    technicalSpecs: p.json<TechnicalSpec[]>().defaultRaw("'[]'"),
    status: p.enum(PRODUCT_STATUSES).default("draft").index(),
    /** Shown in the home page's featured slider when published (storefront spec G9). */
    featured: p.boolean().default(false).index(),
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
  checks: [
    {
      name: "products_technical_specs_check",
      expression: "jsonb_typeof(technical_specs) = 'array'",
    },
  ],
});

export type Product = InferEntity<typeof ProductSchema>;
