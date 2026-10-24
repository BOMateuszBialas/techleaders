import { CUSTOMER_ROLES } from "@commerceos/core";
import { defineEntity, p, type InferEntity } from "@mikro-orm/core";

/**
 * Customer Better Auth tables (E07 spec A1, Data Model). A separate identity set from the
 * `admin_*` tables: no relation exists between them. The column set mirrors Better Auth
 * 1.7.10's generated schema for the customer instance (spec "Spike results", item g); Better
 * Auth reads and writes these rows through its own pool, and MikroORM only owns the schema.
 * The generated SQL has no role check, so the entity adds one: only `customer` is storable.
 */
export const CustomerUserSchema = defineEntity({
  name: "CustomerUser",
  tableName: "customer_users",
  properties: {
    id: p.uuid().primary().defaultRaw("gen_random_uuid()"),
    /** Always "Customer", set by the server (spec A7). */
    name: p.text(),
    email: p.text().unique(),
    /** Always false: there is no email verification (spec A4). */
    emailVerified: p.boolean(),
    /** Always null (spec A7). */
    image: p.text().nullable(),
    role: p.enum(CUSTOMER_ROLES).default("customer"),
    createdAt: p.datetime().defaultRaw("now()"),
    updatedAt: p.datetime().defaultRaw("now()"),
  },
});

export type CustomerUser = InferEntity<typeof CustomerUserSchema>;
