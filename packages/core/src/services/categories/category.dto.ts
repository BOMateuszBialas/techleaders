import type { AdminCategoryRecord, CategoryProductRef } from "../../ports/catalog.port";

/** How many product names the category page lists before "and N more" (spec G1). */
export const CATEGORY_PRODUCT_PREVIEW_LIMIT = 10;

/** A category with the first products that use it, for the admin category page. */
export type AdminCategoryDetail = AdminCategoryRecord & { products: CategoryProductRef[] };

export const CATEGORY_NOT_FOUND_MESSAGE = "Category not found.";
