import { ADMIN_ROLES } from "@commerceos/core";
import { defineEntity, p, type InferEntity } from "@mikro-orm/core";

/**
 * Better Auth tables (admin authentication spec, Data Model). The column set mirrors
 * Better Auth 1.7.10's generated schema (spec "Spike results"); Better Auth reads and
 * writes these rows through its own pool, and MikroORM only owns the schema.
 */
export const AdminUserSchema = defineEntity({
  name: "AdminUser",
  tableName: "admin_users",
  properties: {
    id: p.uuid().primary().defaultRaw("gen_random_uuid()"),
    name: p.text(),
    email: p.text().unique(),
    emailVerified: p.boolean(),
    image: p.text().nullable(),
    role: p.enum(ADMIN_ROLES).default("owner"),
    createdAt: p.datetime().defaultRaw("now()"),
    updatedAt: p.datetime().defaultRaw("now()"),
  },
});

export type AdminUser = InferEntity<typeof AdminUserSchema>;
