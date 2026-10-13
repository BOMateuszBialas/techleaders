import { CategorySchema } from "./category";
import { ProductSchema } from "./product";

export * from "./category";
export * from "./product";

/** Every entity must be registered here; the ORM config uses this list (no folder discovery). */
export const entities = [CategorySchema, ProductSchema];
