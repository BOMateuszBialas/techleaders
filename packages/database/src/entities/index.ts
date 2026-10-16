import { AdminAccountSchema } from "./auth/admin-account.entity";
import { AdminRateLimitSchema } from "./auth/admin-rate-limit.entity";
import { AdminSessionSchema } from "./auth/admin-session.entity";
import { AdminUserSchema } from "./auth/admin-user.entity";
import { AdminVerificationSchema } from "./auth/admin-verification.entity";
import { CategorySchema } from "./categories/category.entity";
import { StockAdjustmentSchema } from "./inventory/stock-adjustment.entity";
import { ProductSchema } from "./products/product.entity";

export * from "./auth/admin-account.entity";
export * from "./auth/admin-rate-limit.entity";
export * from "./auth/admin-session.entity";
export * from "./auth/admin-user.entity";
export * from "./auth/admin-verification.entity";
export * from "./categories/category.entity";
export * from "./inventory/stock-adjustment.entity";
export * from "./products/product.entity";

/** Every entity must be registered here; the ORM config uses this list (no folder discovery). */
export const entities = [
  CategorySchema,
  ProductSchema,
  StockAdjustmentSchema,
  AdminUserSchema,
  AdminSessionSchema,
  AdminAccountSchema,
  AdminVerificationSchema,
  AdminRateLimitSchema,
];
