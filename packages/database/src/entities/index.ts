import { CategorySchema } from "./categories/category.entity";
import { ProductSchema } from "./products/product.entity";

export * from "./categories/category.entity";
export * from "./products/product.entity";

/** Every entity must be registered here; the ORM config uses this list (no folder discovery). */
export const entities = [CategorySchema, ProductSchema];
